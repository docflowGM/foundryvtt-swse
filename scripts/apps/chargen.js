// ============================================
// FILE: scripts/chargen/chargen.js
// Fixed to properly integrate with SWSEActorSheet
// ============================================

import { DROID_SYSTEMS } from '../data/droid-systems.js';
import { escapeHtml } from '../utils/string-utils.js';
import { PrerequisiteValidator } from '../utils/prerequisite-validator.js';

export default class CharacterGenerator extends Application {
  constructor(actor = null, options = {}) {
    super(options);
    this.actor = actor;
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
    
    // Caches for compendia
    this._packs = {
      species: null,
      feats: null,
      talents: null,
      classes: null,
      droids: null
    };
    this._skillsJson = null;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["swse", "chargen"],
      template: "systems/swse/templates/apps/chargen.hbs",
      width: 900,
      height: 700,
      title: "Character Generator",
      resizable: true
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

    for (const [k, packName] of Object.entries(packNames)) {
      try {
        const pack = game.packs.get(packName);
        if (!pack) {
          this._packs[k] = [];
          continue;
        }
        const docs = await pack.getDocuments();
        this._packs[k] = docs.map(d => d.toObject());
      } catch (err) {
        console.warn(`chargen: failed to load pack ${packName}:`, err);
        this._packs[k] = [];
      }
    }

    // Load skills
    try {
      const resp = await fetch("systems/swse/data/skills.json");
      if (resp.ok) {
        this._skillsJson = await resp.json();
      } else {
        this._skillsJson = this._getDefaultSkills();
      }
    } catch (e) {
      console.warn("chargen: failed to load skills.json, using defaults", e);
      this._skillsJson = this._getDefaultSkills();
    }
  }

  _getDefaultSkills() {
    return [
      { key: "acrobatics", name: "Acrobatics", ability: "dex", trained: false },
      { key: "climb", name: "Climb", ability: "str", trained: false },
      { key: "deception", name: "Deception", ability: "cha", trained: false },
      { key: "endurance", name: "Endurance", ability: "con", trained: false },
      { key: "gatherInfo", name: "Gather Information", ability: "cha", trained: false },
      { key: "initiative", name: "Initiative", ability: "dex", trained: false },
      { key: "jump", name: "Jump", ability: "str", trained: false },
      { key: "mechanics", name: "Mechanics", ability: "int", trained: false },
      { key: "perception", name: "Perception", ability: "wis", trained: false },
      { key: "persuasion", name: "Persuasion", ability: "cha", trained: false },
      { key: "pilot", name: "Pilot", ability: "dex", trained: false },
      { key: "stealth", name: "Stealth", ability: "dex", trained: false },
      { key: "survival", name: "Survival", ability: "wis", trained: false },
      { key: "swim", name: "Swim", ability: "str", trained: false },
      { key: "treatInjury", name: "Treat Injury", ability: "wis", trained: false },
      { key: "useComputer", name: "Use Computer", ability: "int", trained: false },
      { key: "useTheForce", name: "Use the Force", ability: "cha", trained: false }
    ];
  }

  _getAvailableSkills() {
    return this._skillsJson || this._getDefaultSkills();
  }

  async getData() {
    const context = super.getData();
    if (!this._packs.species) await this._loadData();

    context.characterData = this.characterData;
    context.currentStep = this.currentStep;
    context.isLevelUp = !!this.actor;
    context.packs = foundry.utils.deepClone(this._packs);
    context.skillsJson = this._skillsJson || [];

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

    // Filter classes for level 0 droids (no Jedi classes)
    if (this.characterData.isDroid && this.characterData.level === 0 && context.packs.classes) {
      context.packs.classes = context.packs.classes.filter(c => {
        const className = (c.name || "").toLowerCase();
        return !className.includes("jedi");
      });
    }

    // Filter feats based on prerequisites
    if (context.packs.feats) {
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

      // Filter by class bonus feats if a class is selected
      let featsToFilter = context.packs.feats;
      if (this.characterData.classes && this.characterData.classes.length > 0) {
        const selectedClass = this.characterData.classes[0];
        const className = selectedClass.name || selectedClass;
        featsToFilter = context.packs.feats.filter(f => {
          const bonusFeatFor = f.system?.bonus_feat_for || [];
          return bonusFeatFor.includes(className);
        });
        console.log(`CharGen | Filtered to ${featsToFilter.length} bonus feats for ${className}`);
      }

      // Filter feats based on prerequisites
      const filteredFeats = PrerequisiteValidator.filterQualifiedFeats(featsToFilter, tempActor, pendingData);
      context.packs.feats = filteredFeats.filter(f => f.isQualified);
      context.packs.allFeats = filteredFeats; // Include all feats with qualification status

      console.log(`CharGen | Filtered feats: ${context.packs.feats.length} qualified out of ${filteredFeats.length} total`);
    }

    // Point buy pools
    context.droidPointBuyPool = game.settings.get("swse", "droidPointBuyPool") || 20;
    context.livingPointBuyPool = game.settings.get("swse", "livingPointBuyPool") || 25;

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
    
    // Navigation
    html.find('.next-step').click(this._onNextStep.bind(this));
    html.find('.prev-step').click(this._onPrevStep.bind(this));
    html.find('.finish').click(this._onFinish.bind(this));

    // Selections
    html.find('.select-type').click(this._onSelectType.bind(this));
    html.find('.select-degree').click(this._onSelectDegree.bind(this));
    html.find('.select-size').click(this._onSelectSize.bind(this));
    html.find('.import-droid-btn').click(this._onImportDroid.bind(this));
    html.find('.select-species').click(this._onSelectSpecies.bind(this));
    html.find('.select-class').click(this._onSelectClass.bind(this));
    html.find('.select-feat').click(this._onSelectFeat.bind(this));
    html.find('.remove-feat').click(this._onRemoveFeat.bind(this));
    html.find('.select-talent').click(this._onSelectTalent.bind(this));
    html.find('.skill-select').change(this._onSkillSelect.bind(this));
    html.find('.train-skill-btn').click(this._onTrainSkill.bind(this));
    html.find('.untrain-skill-btn').click(this._onUntrainSkill.bind(this));
    html.find('.reset-skills-btn').click(this._onResetSkills.bind(this));

    // Droid builder/shop
    html.find('.shop-tab').click(this._onShopTabClick.bind(this));
    html.find('.accessory-tab').click(this._onAccessoryTabClick.bind(this));
    html.find('.purchase-system').click(this._onPurchaseSystem.bind(this));
    html.find('.remove-system').click(this._onRemoveSystem.bind(this));

    // Name input
    html.find('input[name="character-name"]').change((ev) => {
      this.characterData.name = ev.target.value;
    });

    // Shop button
    html.find('.open-shop-btn').click(this._onOpenShop.bind(this));

    // Abilities UI
    if (this.currentStep === "abilities") {
      this._bindAbilitiesUI(html[0]);
    }

    // Skills UI
    if (this.currentStep === "skills") {
      this._bindSkillsUI(html[0]);
    }

    // Droid Builder UI
    if (this.currentStep === "droid-builder") {
      this._populateDroidBuilder(html[0]);
    }

    // Class change
    html.find('[name="class_select"]').change(async (ev) => {
      await this._onClassChanged(ev, html[0]);
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

    steps.push("abilities", "class", "feats", "talents", "skills", "summary", "shop");
    return steps;
  }

  async _onNextStep(event) {
    event.preventDefault();

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

  _validateCurrentStep() {
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
      case "class":
        if (this.characterData.classes.length === 0) {
          ui.notifications.warn("Please select a class.");
          return false;
        }
        break;
    }
    return true;
  }

  async _onSelectType(event) {
    event.preventDefault();
    const type = event.currentTarget.dataset.type;
    this.characterData.isDroid = (type === "droid");

    console.log(`SWSE CharGen | Selected type: ${type} (isDroid: ${this.characterData.isDroid})`);
    await this._onNextStep(event);
  }

  async _onSelectDegree(event) {
    event.preventDefault();
    const degree = event.currentTarget.dataset.degree;
    this.characterData.droidDegree = degree;

    // Apply droid degree bonuses
    const bonuses = this._getDroidDegreeBonuses(degree);
    for (const [k, v] of Object.entries(bonuses || {})) {
      if (this.characterData.abilities[k]) {
        this.characterData.abilities[k].racial = Number(v || 0);
      }
    }

    // Droids don't have CON
    this.characterData.abilities.con.base = 0;
    this.characterData.abilities.con.racial = 0;
    this.characterData.abilities.con.total = 0;
    this.characterData.abilities.con.mod = 0;

    this._recalcAbilities();
    await this._onNextStep(event);
  }

  async _onSelectSize(event) {
    event.preventDefault();
    const size = event.currentTarget.dataset.size;
    this.characterData.droidSize = size;

    // Apply size modifiers to abilities (in addition to degree bonuses)
    const sizeModifiers = {
      "tiny": { dex: 4, str: -4 },
      "small": { dex: 2, str: -2 },
      "medium": {},
      "large": { str: 4, dex: -2 },
      "huge": { str: 8, dex: -4 },
      "gargantuan": { str: 12, dex: -4 },
      "colossal": { str: 16, dex: -4 }
    };

    const mods = sizeModifiers[size] || {};
    for (const [ability, modifier] of Object.entries(mods)) {
      this.characterData.abilities[ability].racial += modifier;
    }

    this._recalcAbilities();
    await this._onNextStep(event);
  }

  _getDroidDegreeBonuses(degree) {
    const bonuses = {
      "1st-degree": { int: 2, wis: 2, str: -2 },
      "2nd-degree": { int: 2, cha: -2 },
      "3rd-degree": { wis: 2, cha: 2, str: -2 },
      "4th-degree": { dex: 2, int: -2, cha: -2 },
      "5th-degree": { str: 4, int: -4, cha: -4 }
    };
    return bonuses[degree] || {};
  }

  _getCostFactor() {
    const size = this.characterData.droidSize || "medium";
    const costFactors = {
      "tiny": 5,
      "small": 2,
      "medium": 1,
      "large": 2,
      "huge": 5,
      "gargantuan": 10,
      "colossal": 20
    };
    return costFactors[size] || 1;
  }

  // ========================================
  // DROID BUILDER METHODS
  // ========================================

  _populateDroidBuilder(root) {
    const doc = root || this.element[0];
    if (!doc) return;

    // Get house rule settings for credits
    const baseCredits = game.settings.get("swse", "droidConstructionCredits") || 1000;
    this.characterData.droidCredits.base = baseCredits;
    this.characterData.droidCredits.remaining = baseCredits - this.characterData.droidCredits.spent;

    // Update credits display
    this._updateDroidCreditsDisplay(doc);

    // Populate all tabs
    this._populateLocomotionSystems(doc);
    this._populateProcessorSystems(doc);
    this._populateAppendageSystems(doc);
    this._populateAccessories(doc);
  }

  _populateLocomotionSystems(doc) {
    const container = doc.querySelector('#locomotion-list');
    if (!container) return;

    const costFactor = this._getCostFactor();
    const size = this.characterData.droidSize;
    let html = '<div class="systems-grid">';

    for (const loco of DROID_SYSTEMS.locomotion) {
      const speed = loco.speeds[size] || loco.speeds.medium;
      const cost = loco.costFormula(speed, costFactor);
      const weight = loco.weightFormula(costFactor);
      const isPurchased = this.characterData.droidSystems.locomotion?.id === loco.id;

      html += `
        <div class="system-item ${isPurchased ? 'purchased' : ''}">
          <h4>${loco.name}</h4>
          <p><strong>Speed:</strong> ${speed} squares</p>
          <p><strong>Cost:</strong> ${cost.toLocaleString()} cr</p>
          <p><strong>Weight:</strong> ${weight} kg</p>
          <p><strong>Availability:</strong> ${loco.availability}</p>
          ${isPurchased
            ? '<button type="button" class="remove-system" data-category="locomotion" data-id="' + loco.id + '"><i class="fas fa-times"></i> Remove</button>'
            : '<button type="button" class="purchase-system" data-category="locomotion" data-id="' + loco.id + '" data-cost="' + cost + '" data-weight="' + weight + '" data-speed="' + speed + '"><i class="fas fa-cart-plus"></i> Select</button>'
          }
        </div>
      `;
    }

    html += '</div>';
    container.innerHTML = html;
  }

  _populateProcessorSystems(doc) {
    const container = doc.querySelector('#processor-list');
    if (!container) return;

    const costFactor = this._getCostFactor();
    let html = '<div class="systems-grid">';

    for (const proc of DROID_SYSTEMS.processors) {
      // Handle both formula-based and flat cost/weight
      const cost = typeof proc.costFormula === 'function'
        ? proc.costFormula(costFactor)
        : (proc.cost || 0);
      const weight = typeof proc.weightFormula === 'function'
        ? proc.weightFormula(costFactor)
        : (proc.weight || 0);
      const isPurchased = this.characterData.droidSystems.processor?.id === proc.id;
      const isFree = proc.id === 'heuristic';

      html += `
        <div class="system-item ${isPurchased ? 'purchased' : ''} ${isFree ? 'free-item' : ''}">
          <h4>${proc.name} ${isFree ? '<span class="free-badge">FREE</span>' : ''}</h4>
          <p class="system-description">${proc.description}</p>
          <p><strong>Cost:</strong> ${cost > 0 ? cost.toLocaleString() + ' cr' : 'Free'}</p>
          <p><strong>Weight:</strong> ${weight} kg</p>
          <p><strong>Availability:</strong> ${proc.availability}</p>
          ${isPurchased
            ? '<button type="button" class="remove-system" data-category="processor" data-id="' + proc.id + '"><i class="fas fa-times"></i> Remove</button>'
            : '<button type="button" class="purchase-system" data-category="processor" data-id="' + proc.id + '" data-cost="' + cost + '" data-weight="' + weight + '"><i class="fas fa-cart-plus"></i> Select</button>'
          }
        </div>
      `;
    }

    html += '</div>';
    container.innerHTML = html;
  }

  _populateAppendageSystems(doc) {
    const container = doc.querySelector('#appendages-list');
    if (!container) return;

    const costFactor = this._getCostFactor();
    let html = '<div class="systems-grid">';

    for (const app of DROID_SYSTEMS.appendages) {
      // Handle both formula-based and flat cost/weight
      const cost = typeof app.costFormula === 'function'
        ? app.costFormula(costFactor)
        : (app.cost || 0);
      const weight = typeof app.weightFormula === 'function'
        ? app.weightFormula(costFactor)
        : (app.weight || 0);
      const purchaseCount = this.characterData.droidSystems.appendages.filter(a => a.id === app.id).length;
      const isFree = app.id === 'hand' && purchaseCount < 2;

      html += `
        <div class="system-item ${purchaseCount > 0 ? 'purchased' : ''} ${isFree ? 'free-item' : ''}">
          <h4>${app.name} ${isFree ? '<span class="free-badge">FREE (2×)</span>' : ''}</h4>
          <p class="system-description">${app.description}</p>
          <p><strong>Cost:</strong> ${isFree ? 'Free (2×)' : cost.toLocaleString() + ' cr'}</p>
          <p><strong>Weight:</strong> ${weight} kg</p>
          <p><strong>Availability:</strong> ${app.availability}</p>
          ${purchaseCount > 0 ? '<p class="purchase-count">Owned: ' + purchaseCount + '</p>' : ''}
          <button type="button" class="purchase-system" data-category="appendage" data-id="${app.id}" data-cost="${isFree ? 0 : cost}" data-weight="${weight}"><i class="fas fa-cart-plus"></i> Add</button>
          ${purchaseCount > 0 ? '<button type="button" class="remove-system" data-category="appendage" data-id="' + app.id + '"><i class="fas fa-minus"></i> Remove One</button>' : ''}
        </div>
      `;
    }

    html += '</div>';
    container.innerHTML = html;
  }

  _populateAccessories(doc) {
    // Populate all accessory categories
    this._populateAccessoryCategory(doc, 'armor', DROID_SYSTEMS.accessories.armor);
    this._populateAccessoryCategory(doc, 'communications', DROID_SYSTEMS.accessories.communications);
    this._populateAccessoryCategory(doc, 'sensors', DROID_SYSTEMS.accessories.sensors);
    this._populateAccessoryCategory(doc, 'shields', DROID_SYSTEMS.accessories.shields);
    this._populateAccessoryCategory(doc, 'translators', DROID_SYSTEMS.accessories.translators);
    this._populateAccessoryCategory(doc, 'miscellaneous', DROID_SYSTEMS.accessories.miscellaneous);
  }

  _populateAccessoryCategory(doc, category, items) {
    const container = doc.querySelector(`#accessories-${category}`);
    if (!container) return;

    const costFactor = this._getCostFactor();
    let html = '<div class="systems-grid">';

    for (const item of items) {
      // Handle both formula-based and flat cost/weight
      const cost = typeof item.costFormula === 'function'
        ? item.costFormula(costFactor)
        : (item.cost || 0);
      const weight = typeof item.weightFormula === 'function'
        ? item.weightFormula(costFactor)
        : (item.weight || 0);
      const isPurchased = this.characterData.droidSystems.accessories.some(a => a.id === item.id);

      html += `
        <div class="system-item ${isPurchased ? 'purchased' : ''}">
          <h4>${item.name}</h4>
          <p class="system-description">${item.description || ''}</p>
          ${item.type ? '<p><strong>Type:</strong> ' + item.type + '</p>' : ''}
          ${item.reflexBonus ? '<p><strong>Reflex Bonus:</strong> +' + item.reflexBonus + '</p>' : ''}
          ${item.maxDex !== undefined ? '<p><strong>Max Dex:</strong> ' + item.maxDex + '</p>' : ''}
          ${item.armorPenalty ? '<p><strong>Armor Penalty:</strong> ' + item.armorPenalty + '</p>' : ''}
          ${item.sr ? '<p><strong>Shield Rating:</strong> SR ' + item.sr + '</p>' : ''}
          ${item.dc ? '<p><strong>Translator DC:</strong> DC ' + item.dc + '</p>' : ''}
          ${item.bonus ? '<p><strong>Bonus:</strong> ' + item.bonus + '</p>' : ''}
          <p><strong>Cost:</strong> ${cost.toLocaleString()} cr</p>
          <p><strong>Weight:</strong> ${weight} kg</p>
          <p><strong>Availability:</strong> ${item.availability}</p>
          ${isPurchased
            ? '<button type="button" class="remove-system" data-category="accessory" data-subcategory="' + category + '" data-id="' + item.id + '"><i class="fas fa-times"></i> Remove</button>'
            : '<button type="button" class="purchase-system" data-category="accessory" data-subcategory="' + category + '" data-id="' + item.id + '" data-cost="' + cost + '" data-weight="' + weight + '"><i class="fas fa-cart-plus"></i> Purchase</button>'
          }
        </div>
      `;
    }

    html += '</div>';
    container.innerHTML = html;
  }

  _onShopTabClick(event) {
    event.preventDefault();
    const tabName = event.currentTarget.dataset.tab;
    const doc = this.element[0];

    // Switch active tab
    doc.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
    event.currentTarget.classList.add('active');

    // Switch active panel
    doc.querySelectorAll('.shop-panel').forEach(p => p.classList.remove('active'));
    const panel = doc.querySelector(`[data-panel="${tabName}"]`);
    if (panel) panel.classList.add('active');

    // Update cart if switching to cart tab
    if (tabName === 'cart') {
      this._updateCartDisplay(doc);
    }
  }

  _onAccessoryTabClick(event) {
    event.preventDefault();
    const tabName = event.currentTarget.dataset.accessorytab;
    const doc = this.element[0];

    // Switch active accessory tab
    doc.querySelectorAll('.accessory-tab').forEach(t => t.classList.remove('active'));
    event.currentTarget.classList.add('active');

    // Switch active accessory panel
    doc.querySelectorAll('.accessory-panel').forEach(p => p.classList.remove('active'));
    const panel = doc.querySelector(`[data-accessory-panel="${tabName}"]`);
    if (panel) panel.classList.add('active');
  }

  _onPurchaseSystem(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const category = button.dataset.category;
    const subcategory = button.dataset.subcategory;
    const id = button.dataset.id;
    const cost = Number(button.dataset.cost || 0);
    const weight = Number(button.dataset.weight || 0);

    // Check if can afford
    if (cost > this.characterData.droidCredits.remaining) {
      ui.notifications.warn("Not enough credits!");
      return;
    }

    // Find the system data
    let system;
    if (category === 'locomotion') {
      system = DROID_SYSTEMS.locomotion.find(s => s.id === id);
      if (system) {
        const speed = button.dataset.speed;
        this.characterData.droidSystems.locomotion = {
          id: system.id,
          name: system.name,
          cost,
          weight,
          speed: Number(speed)
        };
      }
    } else if (category === 'processor') {
      system = DROID_SYSTEMS.processors.find(s => s.id === id);
      if (system) {
        this.characterData.droidSystems.processor = {
          id: system.id,
          name: system.name,
          cost,
          weight
        };
      }
    } else if (category === 'appendage') {
      system = DROID_SYSTEMS.appendages.find(s => s.id === id);
      if (system) {
        // Check if this is a free hand
        const handCount = this.characterData.droidSystems.appendages.filter(a => a.id === 'hand').length;
        const actualCost = (id === 'hand' && handCount < 2) ? 0 : cost;

        this.characterData.droidSystems.appendages.push({
          id: system.id,
          name: system.name,
          cost: actualCost,
          weight
        });

        this.characterData.droidCredits.spent += actualCost;
      }
    } else if (category === 'accessory') {
      const accessoryCategory = DROID_SYSTEMS.accessories[subcategory];
      system = accessoryCategory?.find(s => s.id === id);
      if (system) {
        this.characterData.droidSystems.accessories.push({
          id: system.id,
          name: system.name,
          category: subcategory,
          cost,
          weight,
          data: system
        });
      }
    }

    // Update credits (except for appendages which update above)
    if (category !== 'appendage') {
      this.characterData.droidCredits.spent += cost;
    }
    this.characterData.droidCredits.remaining = this.characterData.droidCredits.base - this.characterData.droidCredits.spent;

    // Recalculate totals
    this._recalculateDroidTotals();

    // Re-render
    this.render();
  }

  _onRemoveSystem(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const category = button.dataset.category;
    const subcategory = button.dataset.subcategory;
    const id = button.dataset.id;

    if (category === 'locomotion') {
      const system = this.characterData.droidSystems.locomotion;
      if (system) {
        this.characterData.droidCredits.spent -= system.cost;
        this.characterData.droidSystems.locomotion = null;
      }
    } else if (category === 'processor') {
      const system = this.characterData.droidSystems.processor;
      if (system && system.id !== 'heuristic') { // Can't remove free heuristic
        this.characterData.droidCredits.spent -= system.cost;
        this.characterData.droidSystems.processor = {
          name: "Heuristic Processor",
          id: "heuristic",
          cost: 0,
          weight: 5
        };
      }
    } else if (category === 'appendage') {
      const idx = this.characterData.droidSystems.appendages.findIndex(a => a.id === id);
      if (idx >= 0) {
        const system = this.characterData.droidSystems.appendages[idx];
        this.characterData.droidCredits.spent -= system.cost;
        this.characterData.droidSystems.appendages.splice(idx, 1);
      }
    } else if (category === 'accessory') {
      const idx = this.characterData.droidSystems.accessories.findIndex(a => a.id === id);
      if (idx >= 0) {
        const system = this.characterData.droidSystems.accessories[idx];
        this.characterData.droidCredits.spent -= system.cost;
        this.characterData.droidSystems.accessories.splice(idx, 1);
      }
    }

    this.characterData.droidCredits.remaining = this.characterData.droidCredits.base - this.characterData.droidCredits.spent;

    // Recalculate totals
    this._recalculateDroidTotals();

    // Re-render
    this.render();
  }

  _recalculateDroidTotals() {
    let totalCost = 0;
    let totalWeight = 0;

    if (this.characterData.droidSystems.locomotion) {
      totalCost += this.characterData.droidSystems.locomotion.cost;
      totalWeight += this.characterData.droidSystems.locomotion.weight;
    }

    if (this.characterData.droidSystems.processor) {
      totalCost += this.characterData.droidSystems.processor.cost;
      totalWeight += this.characterData.droidSystems.processor.weight;
    }

    for (const app of this.characterData.droidSystems.appendages) {
      totalCost += app.cost;
      totalWeight += app.weight;
    }

    for (const acc of this.characterData.droidSystems.accessories) {
      totalCost += acc.cost;
      totalWeight += acc.weight;
    }

    this.characterData.droidSystems.totalCost = totalCost;
    this.characterData.droidSystems.totalWeight = totalWeight;
  }

  _updateDroidCreditsDisplay(doc) {
    // Update base credits
    const baseEl = doc.querySelector('.base-credits');
    if (baseEl) baseEl.textContent = this.characterData.droidCredits.base.toLocaleString();

    // Update spent credits
    const spentEl = doc.querySelector('.spent-credits');
    if (spentEl) spentEl.textContent = this.characterData.droidCredits.spent.toLocaleString();

    // Update remaining credits
    const remainingEl = doc.querySelector('.remaining-credits');
    if (remainingEl) {
      remainingEl.textContent = this.characterData.droidCredits.remaining.toLocaleString();

      // Add overbudget class if negative
      if (this.characterData.droidCredits.remaining < 0) {
        remainingEl.classList.add('overbudget');
      } else {
        remainingEl.classList.remove('overbudget');
      }
    }

    // Update total weight
    const weightEl = doc.querySelector('.total-weight');
    if (weightEl) weightEl.textContent = this.characterData.droidSystems.totalWeight.toLocaleString();

    // Update cart count
    this._updateCartCount(doc);
  }

  _updateCartCount(doc) {
    // Count total items (locomotion + appendages + accessories, not counting free processor and free hands)
    let count = 0;

    if (this.characterData.droidSystems.locomotion) count++;

    // Count appendages beyond the 2 free hands
    const extraAppendages = this.characterData.droidSystems.appendages.length;
    count += extraAppendages;

    // Count accessories
    count += this.characterData.droidSystems.accessories.length;

    // Add 2 for the free items (processor + 2 hands)
    const totalCount = count + 2;

    const cartCountEl = doc.querySelector('#cart-count');
    if (cartCountEl) cartCountEl.textContent = totalCount;
  }

  _updateCartDisplay(doc) {
    const cartItemsList = doc.querySelector('#cart-items-list');
    if (!cartItemsList) return;

    // Clear cart (safe - emptying element)
    cartItemsList.innerHTML = '';

    const items = [];

    // Add locomotion
    if (this.characterData.droidSystems.locomotion) {
      const sys = this.characterData.droidSystems.locomotion;
      items.push({
        icon: 'fa-shoe-prints',
        name: sys.name,
        specs: `Speed: ${sys.speed} squares`,
        cost: sys.cost,
        category: 'locomotion',
        id: sys.id
      });
    }

    // Add appendages (beyond free hands)
    for (const app of this.characterData.droidSystems.appendages) {
      if (app.cost > 0) { // Only paid appendages
        items.push({
          icon: 'fa-hand-paper',
          name: app.name,
          specs: `Weight: ${app.weight} kg`,
          cost: app.cost,
          category: 'appendage',
          id: app.id
        });
      }
    }

    // Add accessories
    for (const acc of this.characterData.droidSystems.accessories) {
      items.push({
        icon: 'fa-tools',
        name: acc.name,
        specs: acc.data?.description || `Weight: ${acc.weight} kg`,
        cost: acc.cost,
        category: 'accessory',
        id: acc.id,
        subcategory: acc.category
      });
    }

    // Render cart items
    if (items.length === 0) {
      cartItemsList.innerHTML = `
        <div class="cart-empty-message">
          <i class="fas fa-box-open"></i>
          <p>No systems added yet. Browse the shop to customize your droid!</p>
        </div>
      `;
    } else {
      for (const item of items) {
        const removeDataAttrs = item.category === 'accessory'
          ? `data-category="${item.category}" data-subcategory="${item.subcategory}" data-id="${item.id}"`
          : `data-category="${item.category}" data-id="${item.id}"`;

        cartItemsList.innerHTML += `
          <div class="cart-item">
            <div class="item-icon"><i class="fas ${item.icon}"></i></div>
            <div class="item-details">
              <div class="item-name">${item.name}</div>
              <div class="item-specs">${item.specs}</div>
            </div>
            <div class="item-price">
              <span class="price-amount">${item.cost.toLocaleString()} cr</span>
            </div>
            <button type="button" class="remove-from-cart remove-system" ${removeDataAttrs}>
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        `;
      }
    }

    // Update validation
    this._updateCartValidation(doc);
  }

  _updateCartValidation(doc) {
    const validationContainer = doc.querySelector('#cart-validation');
    if (!validationContainer) return;

    const issues = [];

    if (!this.characterData.droidSystems.locomotion) {
      issues.push({ id: 'locomotion', text: 'Locomotion system required' });
    }

    if (this.characterData.droidSystems.appendages.length === 0) {
      issues.push({ id: 'appendages', text: 'At least one appendage required' });
    }

    if (this.characterData.droidCredits.remaining < 0) {
      issues.push({ id: 'budget', text: 'Over budget! Remove some systems.' });
    }

    // Render validation issues
    if (issues.length === 0) {
      validationContainer.innerHTML = `
        <div class="validation-success">
          <i class="fas fa-check-circle"></i>
          <span>All requirements met! Ready to proceed.</span>
        </div>
      `;
    } else {
      validationContainer.innerHTML = issues.map(issue => `
        <div class="validation-item" id="validation-${escapeHtml(issue.id)}">
          <i class="fas fa-exclamation-circle"></i>
          <span>${escapeHtml(issue.text)}</span>
        </div>
      `).join('');
    }
  }

  _validateDroidBuilder() {
    // Must have locomotion
    if (!this.characterData.droidSystems.locomotion) {
      ui.notifications.warn("Droids must have a locomotion system!");
      return false;
    }

    // Must have processor (always true since Heuristic is free)
    if (!this.characterData.droidSystems.processor) {
      ui.notifications.warn("Droids must have a processor!");
      return false;
    }

    // Must have at least one appendage
    if (this.characterData.droidSystems.appendages.length === 0) {
      ui.notifications.warn("Droids must have at least one appendage!");
      return false;
    }

    // Can't be over budget
    if (this.characterData.droidCredits.remaining < 0) {
      ui.notifications.warn("You are over budget! Remove some systems.");
      return false;
    }

    return true;
  }

  async _onImportDroid(event) {
    event.preventDefault();

    if (!this._packs.droids) await this._loadData();

    // Create a search dialog
    const droidList = this._packs.droids.map(d => ({
      name: d.name,
      id: d._id,
      system: d.system
    }));

    const dialogContent = `
      <div class="droid-import-dialog">
        <p>Search for a droid type to import:</p>
        <input type="text" id="droid-search" placeholder="Type droid name..." autofocus />
        <div id="droid-results" class="droid-results"></div>
      </div>
      <style>
        .droid-import-dialog {
          padding: 1rem;
        }
        #droid-search {
          width: 100%;
          padding: 0.5rem;
          margin-bottom: 1rem;
          font-size: 1rem;
        }
        .droid-results {
          max-height: 300px;
          overflow-y: auto;
        }
        .droid-result-item {
          padding: 0.75rem;
          margin: 0.5rem 0;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid #0a74da;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .droid-result-item:hover {
          background: rgba(10, 116, 218, 0.2);
          transform: translateX(4px);
        }
      </style>
    `;

    const dialog = new Dialog({
      title: "Import Droid Type",
      content: dialogContent,
      buttons: {
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      },
      render: (html) => {
        const searchInput = html.find('#droid-search');
        const resultsDiv = html.find('#droid-results');

        const renderResults = (query) => {
          const filtered = query
            ? droidList.filter(d => d.name.toLowerCase().includes(query.toLowerCase()))
            : droidList;

          const resultsHTML = filtered.map(d => `
            <div class="droid-result-item" data-droid-id="${d.id}">
              <strong>${d.name}</strong>
            </div>
          `).join('');

          resultsDiv.html(resultsHTML || '<p>No droids found</p>');

          // Add click handlers to results
          resultsDiv.find('.droid-result-item').click(async (e) => {
            const droidId = e.currentTarget.dataset.droidId;
            const droid = droidList.find(d => d.id === droidId);
            if (droid) {
              await this._importDroidType(droid);
              dialog.close();
            }
          });
        };

        // Initial render
        renderResults('');

        // Search on input
        searchInput.on('input', (e) => {
          renderResults(e.target.value);
        });
      }
    }, {
      width: 500
    });

    dialog.render(true);
  }

  async _importDroidType(droid) {
    console.log(`SWSE CharGen | Importing droid type: ${droid.name}`, droid);

    // Apply droid's ability scores
    if (droid.system && droid.system.abilities) {
      for (const [ability, value] of Object.entries(droid.system.abilities)) {
        if (this.characterData.abilities[ability]) {
          this.characterData.abilities[ability].base = value.value || value || 10;
        }
      }
    }

    // Set as droid
    this.characterData.isDroid = true;
    this.characterData.droidDegree = droid.system.droidDegree || "2nd-degree";
    this.characterData.importedDroidData = droid; // Store for later use

    // Droids don't have CON
    this.characterData.abilities.con.base = 0;
    this.characterData.abilities.con.total = 0;
    this.characterData.abilities.con.mod = 0;

    // Auto-select droid's default skills
    if (droid.system && droid.system.skills) {
      this.characterData.preselectedSkills = Object.keys(droid.system.skills || {});
    }

    this._recalcAbilities();

    ui.notifications.success(`${droid.name} template loaded! Continue with class selection.`);

    // Continue to class selection
    this.currentStep = "class";
    await this.render();
  }

  async _createImportedDroidActor(droid) {
    try {
      // Build actor data from imported droid
      const actorData = {
        name: this.characterData.name || droid.name,
        type: "character",
        system: {
          isDroid: true,
          droidDegree: droid.system.droidDegree || "2nd-degree",
          species: droid.system.droidDegree || "Droid",
          abilities: {},
          hp: droid.system.hp || { value: 10, max: 10, temp: 0 },
          level: 1,
          defenses: droid.system.defenses || {
            fortitude: { base: 10, armor: 0, ability: 0, classBonus: 0, misc: 0, total: 10 },
            reflex: { base: 10, armor: 0, ability: 0, classBonus: 0, misc: 0, total: 10 },
            will: { base: 10, armor: 0, ability: 0, classBonus: 0, misc: 0, total: 10 }
          },
          bab: 0,
          speed: droid.system.speed || 6,
          skills: droid.system.skills || {},
          damageThresholdMisc: 0
        }
      };

      // Copy abilities
      if (droid.system && droid.system.abilities) {
        for (const [ability, value] of Object.entries(droid.system.abilities)) {
          actorData.system.abilities[ability] = {
            base: value.value || value || 10,
            racial: 0,
            temp: 0
          };
        }
      }

      // Ensure CON is 0 for droids
      actorData.system.abilities.con = { base: 0, racial: 0, temp: 0 };

      console.log("SWSE CharGen | Creating imported droid actor with data:", actorData);

      const actor = await Actor.create(actorData);

      // Add equipment from droid if any
      if (droid.system && droid.system.equipment) {
        const items = Array.isArray(droid.system.equipment)
          ? droid.system.equipment
          : Object.values(droid.system.equipment || {});

        if (items.length > 0) {
          await actor.createEmbeddedDocuments("Item", items);
        }
      }

      return actor;
    } catch (err) {
      console.error("SWSE CharGen | Error creating imported droid actor:", err);
      return null;
    }
  }

  async _onSelectSpecies(event) {
    event.preventDefault();
    const speciesKey = event.currentTarget.dataset.species;

    // Find the species document
    if (!this._packs.species) await this._loadData();
    const speciesDoc = this._packs.species.find(s => s.name === speciesKey || s._id === speciesKey);

    if (!speciesDoc) {
      console.warn(`CharGen | Species not found: ${speciesKey}`);
      return;
    }

    this.characterData.species = speciesKey;

    // Apply all species data
    this._applySpeciesData(speciesDoc);

    this._recalcAbilities();
    await this._onNextStep(event);
  }

  /**
   * Apply all species data to character
   * @param {Object} speciesDoc - Species document from compendium
   */
  _applySpeciesData(speciesDoc) {
    const system = speciesDoc.system || {};

    // 1. Apply ability score modifiers
    const abilityBonuses = this._parseAbilityString(system.abilities || "None");
    for (const [ability, bonus] of Object.entries(abilityBonuses)) {
      if (this.characterData.abilities[ability]) {
        this.characterData.abilities[ability].racial = bonus;
      }
    }

    // 2. Apply speed
    if (system.speed) {
      const speed = Number(system.speed);
      this.characterData.speed = speed;
    }

    // 3. Store size
    this.characterData.size = system.size || "Medium";

    // 4. Store special abilities
    this.characterData.specialAbilities = system.special || [];

    // 5. Check for Human racial bonuses
    if (speciesDoc.name === "Human" || speciesDoc.name === "human") {
      this.characterData.featsRequired = 2; // Humans get bonus feat
      console.log("CharGen | Human species: Bonus feat granted (2 feats required)");
    } else {
      this.characterData.featsRequired = 1; // All other species get 1 feat
    }

    // 6. Store languages
    this.characterData.languages = system.languages || [];

    // 7. Apply skill bonuses (store for later application)
    this.characterData.racialSkillBonuses = system.skillBonuses || [];

    // 8. Store source
    this.characterData.speciesSource = system.source || "";

    console.log(`CharGen | Applied species data for ${speciesDoc.name}:`, {
      abilities: abilityBonuses,
      speed: this.characterData.speed,
      size: this.characterData.size,
      special: this.characterData.specialAbilities,
      languages: this.characterData.languages,
      skillBonuses: this.characterData.racialSkillBonuses
    });
  }

  /**
   * Parse ability string like "+2 Dex, -2 Con" or "+4 Str, +2 Con, -2 Int, -2 Cha"
   * @param {string} abilityString - Ability modifier string
   * @returns {Object} Map of ability keys to numeric bonuses
   */
  _parseAbilityString(abilityString) {
    const bonuses = {
      str: 0,
      dex: 0,
      con: 0,
      int: 0,
      wis: 0,
      cha: 0
    };

    if (!abilityString || abilityString === "None" || abilityString === "none") {
      return bonuses;
    }

    // Map of ability name variations to keys
    const abilityMap = {
      'str': 'str', 'strength': 'str',
      'dex': 'dex', 'dexterity': 'dex',
      'con': 'con', 'constitution': 'con',
      'int': 'int', 'intelligence': 'int',
      'wis': 'wis', 'wisdom': 'wis',
      'cha': 'cha', 'charisma': 'cha'
    };

    // Split by comma and parse each part
    const parts = abilityString.split(',').map(p => p.trim());

    for (const part of parts) {
      // Match patterns like "+2 Dex", "-2 Con", "+4 Str"
      const match = part.match(/([+-]?\d+)\s*([a-zA-Z]+)/);
      if (match) {
        const value = parseInt(match[1]);
        const abilityName = match[2].toLowerCase();
        const abilityKey = abilityMap[abilityName];

        if (abilityKey) {
          bonuses[abilityKey] = value;
        }
      }
    }

    return bonuses;
  }

  async _getRacialBonuses(speciesName) {
    if (!this._packs.species) await this._loadData();
    const found = this._packs.species.find(s => s.name === speciesName || s._id === speciesName);

    if (!found || !found.system) {
      return {};
    }

    // Parse the abilities string to get bonuses
    return this._parseAbilityString(found.system.abilities || "None");
  }

  async _onSelectClass(event) {
    event.preventDefault();
    const className = event.currentTarget.dataset.class;
    
    // Find class document
    const classDoc = this._packs.classes.find(c => c.name === className || c._id === className);
    
    // Add class with level 1
    this.characterData.classes.push({ name: className, level: 1 });
    
    // Set class-based values
    if (classDoc && classDoc.system) {
      // Base Attack Bonus
      this.characterData.bab = Number(classDoc.system.babProgression) || 0;
      
      // Hit Points (5 times hit die at level 1)
      // Parse hit die from string like "1d10" to get the die size (10)
      const hitDieString = classDoc.system.hit_die || classDoc.system.hitDie || "1d6";
      const hitDie = parseInt(hitDieString.match(/\d+d(\d+)/)?.[1] || "6");
      this.characterData.hp.max = hitDie * 5; // Level 1 HP is 5x hit die (e.g., d6=30, d8=40, d10=50)
      this.characterData.hp.value = this.characterData.hp.max;
      
      // Defense bonuses
      if (classDoc.system.defenses) {
        this.characterData.defenses.fortitude.classBonus = Number(classDoc.system.defenses.fortitude) || 0;
        this.characterData.defenses.reflex.classBonus = Number(classDoc.system.defenses.reflex) || 0;
        this.characterData.defenses.will.classBonus = Number(classDoc.system.defenses.will) || 0;
      }
      
      // Trained skills available (class base + INT modifier, minimum 1)
      const classSkills = Number(classDoc.system.trained_skills || classDoc.system.trainedSkills) || 0;
      const intMod = this.characterData.abilities.int.mod || 0;
      const humanBonus = (this.characterData.species === "Human" || this.characterData.species === "human") ? 1 : 0;
      this.characterData.trainedSkillsAllowed = Math.max(1, classSkills + intMod + humanBonus);

      console.log(`CharGen | Skill trainings: ${classSkills} (class) + ${intMod} (INT) + ${humanBonus} (Human) = ${this.characterData.trainedSkillsAllowed}`);
      
      // Force Points (if Force-sensitive class)
      if (classDoc.system.forceSensitive) {
        this.characterData.forcePoints.max = 5 + Math.floor(this.characterData.level / 2);
        this.characterData.forcePoints.value = this.characterData.forcePoints.max;
        this.characterData.forcePoints.die = "1d6";
      }

      // Starting Credits
      if (classDoc.system.starting_credits) {
        const creditsString = classDoc.system.starting_credits;
        // Parse format like "3d4 x 400"
        const match = creditsString.match(/(\d+)d(\d+)\s*x\s*(\d+)/i);
        if (match) {
          const numDice = parseInt(match[1]);
          const dieSize = parseInt(match[2]);
          const multiplier = parseInt(match[3]);

          // Check for house rule to take maximum credits
          // Default to rolling dice
          const takeMax = game.settings?.get("swse", "maxStartingCredits") || false;

          let diceTotal;
          if (takeMax) {
            // Take maximum possible
            diceTotal = numDice * dieSize;
            console.log(`CharGen | Starting credits (max): ${numDice}d${dieSize} = ${diceTotal}, × ${multiplier} = ${diceTotal * multiplier}`);
          } else {
            // Roll dice
            const roll = new Roll(`${numDice}d${dieSize}`);
            roll.evaluate({async: false});
            diceTotal = roll.total;
            console.log(`CharGen | Starting credits (rolled): ${numDice}d${dieSize} = ${diceTotal}, × ${multiplier} = ${diceTotal * multiplier}`);
          }

          this.characterData.credits = diceTotal * multiplier;
        } else {
          console.warn(`CharGen | Could not parse starting_credits: ${creditsString}`);
        }
      }
    }

    // Recalculate defenses
    this._recalcDefenses();
    
    await this._onNextStep(event);
  }

  async _onClassChanged(event, htmlRoot, initial = false) {
    await this._loadData();
    const classNode = (htmlRoot || this.element[0]).querySelector('[name="class_select"]');
    if (!classNode) return;

    const cls = classNode.value;
    const classDoc = this._packs.classes.find(c => c.name === cls || c._id === cls);

    // Calculate skill trainings (class base + INT modifier, minimum 1)
    const classSkills = classDoc && classDoc.system ? Number(classDoc.system.trained_skills || classDoc.system.trainedSkills || 0) : 0;
    const intMod = this.characterData.abilities.int.mod || 0;
    const humanBonus = (this.characterData.species === "Human" || this.characterData.species === "human") ? 1 : 0;
    this.characterData.trainedSkillsAllowed = Math.max(1, classSkills + intMod + humanBonus);

    if (!initial) await this.render();
  }

  async _onSelectFeat(event) {
    event.preventDefault();
    const id = event.currentTarget.dataset.featid;
    const feat = this._packs.feats.find(f => f._id === id || f.name === id);

    if (feat && !this.characterData.feats.find(f => f.name === feat.name)) {
      this.characterData.feats.push(feat);
    }

    // Re-render to show updated feat selection and enable Next button if requirement met
    await this.render();
  }

  async _onSelectTalent(event) {
    event.preventDefault();
    const id = event.currentTarget.dataset.talentid;
    const tal = this._packs.talents.find(t => t._id === id || t.name === id);

    if (tal && !this.characterData.talents.find(t => t.name === tal.name)) {
      this.characterData.talents.push(tal);
    }

    await this._onNextStep(event);
  }

  async _onRemoveFeat(event) {
    event.preventDefault();
    const id = event.currentTarget.dataset.featid;
    this.characterData.feats = this.characterData.feats.filter(f => f._id !== id && f.name !== id);
    await this.render();
  }

  async _onSkillSelect(event) {
    const skillKey = event.currentTarget.dataset.skill;
    const checked = event.currentTarget.checked;

    if (!this.characterData.skills[skillKey]) {
      this.characterData.skills[skillKey] = { trained: false };
    }

    this.characterData.skills[skillKey].trained = checked;
    await this.render();
  }

  async _onTrainSkill(event) {
    event.preventDefault();
    const skillKey = event.currentTarget.dataset.skill;

    // Initialize skill if not exists
    if (!this.characterData.skills[skillKey]) {
      this.characterData.skills[skillKey] = { trained: false };
    }

    // Train the skill
    this.characterData.skills[skillKey].trained = true;
    console.log(`CharGen | Trained skill: ${skillKey}`);
    await this.render();
  }

  async _onUntrainSkill(event) {
    event.preventDefault();
    const skillKey = event.currentTarget.dataset.skill;

    // Untrain the skill
    if (this.characterData.skills[skillKey]) {
      this.characterData.skills[skillKey].trained = false;
      console.log(`CharGen | Untrained skill: ${skillKey}`);
    }

    await this.render();
  }

  async _onResetSkills(event) {
    event.preventDefault();

    // Reset all skills to untrained
    for (const skillKey in this.characterData.skills) {
      this.characterData.skills[skillKey].trained = false;
    }

    console.log("CharGen | Reset all skill selections");
    ui.notifications.info("All skill selections have been reset.");
    await this.render();
  }

  _getFeatsNeeded() {
    const lvl = this.characterData.level || 1;
    return Math.ceil(lvl / 2);
  }

  // ========================================
  // ABILITIES UI
  // ========================================
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
      this.characterData.abilities[ab].base = newVal;
      updatePointRemaining();
      recalcPreview();
    };

    // Standard array roll
    const rollStandard = () => {
      const results = [];
      for (let i = 0; i < 6; i++) {
        const r = new Roll("4d6kh3").evaluate({ async: false });
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
        const ability = target.name.replace("ability_", "");
        target.value = val;
        this.characterData.abilities[ability].base = val;
        recalcPreview();
      }
    };

    // Organic roll
    const rollOrganic = () => {
      const r = new Roll("24d6").evaluate({ async: false });
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
            this.characterData.abilities[a].base = doc._selectedOrganic;
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
        const racial = Number(this.characterData.abilities[a].racial || 0);
        const total = base + racial + Number(this.characterData.abilities[a].temp || 0);
        const mod = Math.floor((total - 10) / 2);

        this.characterData.abilities[a].base = base;
        this.characterData.abilities[a].total = total;
        this.characterData.abilities[a].mod = mod;

        if (display) display.textContent = `Total: ${total} (Mod: ${mod >= 0 ? "+" : ""}${mod})`;
      });

      // Update Second Wind preview
      const hpMax = Number(doc.querySelector('[name="hp_max"]')?.value || 1);
      const conTotal = this.characterData.abilities.con.total || 10;
      const conMod = Math.floor((conTotal - 10) / 2);
      const misc = Number(doc.querySelector('[name="sw_misc"]')?.value || 0);
      const heal = Math.max(Math.floor(hpMax / 4), conMod) + misc;
      this.characterData.secondWind.healing = heal;

      const swPreview = doc.querySelector("#sw_heal_preview");
      if (swPreview) swPreview.textContent = heal;
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

  // ========================================
  // SKILLS UI
  // ========================================
  _bindSkillsUI(root) {
    const doc = root || this.element[0];
    const skillsContainer = doc.querySelector("#skills-list");
    if (!skillsContainer) return;
    
    const maxTrained = this.characterData.trainedSkillsAllowed || 0;
    let trainedCount = 0;
    
    // Count current trained skills
    for (const skill of this._skillsJson) {
      if (this.characterData.skills[skill.key]?.trained) {
        trainedCount++;
      }
    }
    
    // Update counter display
    const updateCounter = () => {
      const counter = doc.querySelector("#trained-counter");
      if (counter) counter.textContent = `${trainedCount} / ${maxTrained}`;
    };
    updateCounter();
    
    // Render skills
    skillsContainer.innerHTML = "";
    for (const skill of this._skillsJson) {
      const skillData = this.characterData.skills[skill.key] || { trained: false, focus: false, misc: 0 };
      
      const row = document.createElement("div");
      row.className = "skill-row";
      
      const label = document.createElement("label");
      label.textContent = skill.name;
      
      const trainedCheck = document.createElement("input");
      trainedCheck.type = "checkbox";
      trainedCheck.checked = skillData.trained;
      trainedCheck.onchange = (ev) => {
        if (ev.target.checked && trainedCount >= maxTrained) {
          ui.notifications.warn(`Maximum trained skills (${maxTrained}) reached!`);
          ev.target.checked = false;
          return;
        }
        
        if (ev.target.checked) trainedCount++;
        else trainedCount--;
        
        if (!this.characterData.skills[skill.key]) {
          this.characterData.skills[skill.key] = {};
        }
        this.characterData.skills[skill.key].trained = ev.target.checked;
        updateCounter();
      };
      
      const focusCheck = document.createElement("input");
      focusCheck.type = "checkbox";
      focusCheck.checked = skillData.focus;
      focusCheck.onchange = (ev) => {
        if (!this.characterData.skills[skill.key]) {
          this.characterData.skills[skill.key] = {};
        }
        this.characterData.skills[skill.key].focus = ev.target.checked;
      };
      
      row.appendChild(label);
      row.appendChild(document.createTextNode(" Trained: "));
      row.appendChild(trainedCheck);
      row.appendChild(document.createTextNode(" Focus: "));
      row.appendChild(focusCheck);
      
      skillsContainer.appendChild(row);
    }
  }

  /**
   * Create a temporary actor-like object for prerequisite validation during character generation
   */
  _createTempActorForValidation() {
    // Ensure abilities are calculated
    this._recalcAbilities();

    // Create a mock actor object with the structure expected by PrerequisiteValidator
    const tempActor = {
      system: {
        level: this.characterData.level || 1,
        bab: this.characterData.bab || 0,
        abilities: foundry.utils.deepClone(this.characterData.abilities),
        skills: {},
        defenses: foundry.utils.deepClone(this.characterData.defenses)
      },
      items: {
        filter: (filterFn) => {
          const items = [];

          // Add feats
          if (this.characterData.feats) {
            for (const feat of this.characterData.feats) {
              items.push({
                type: 'feat',
                name: feat.name || feat,
                system: feat.system || {}
              });
            }
          }

          // Add talents
          if (this.characterData.talents) {
            for (const talent of this.characterData.talents) {
              items.push({
                type: 'talent',
                name: talent.name || talent,
                system: talent.system || {}
              });
            }
          }

          // Add classes
          if (this.characterData.classes) {
            for (const cls of this.characterData.classes) {
              items.push({
                type: 'class',
                name: cls.name || cls,
                system: cls.system || { level: 1 }
              });
            }
          }

          return items.filter(filterFn);
        },
        some: (filterFn) => {
          const items = [];

          // Add feats
          if (this.characterData.feats) {
            for (const feat of this.characterData.feats) {
              items.push({
                type: 'feat',
                name: feat.name || feat,
                system: feat.system || {}
              });
            }
          }

          // Add talents
          if (this.characterData.talents) {
            for (const talent of this.characterData.talents) {
              items.push({
                type: 'talent',
                name: talent.name || talent,
                system: talent.system || {}
              });
            }
          }

          // Add classes
          if (this.characterData.classes) {
            for (const cls of this.characterData.classes) {
              items.push({
                type: 'class',
                name: cls.name || cls,
                system: cls.system || { level: 1, forceSensitive: cls.system?.forceSensitive || false }
              });
            }
          }

          return items.some(filterFn);
        }
      }
    };

    // Map skills to the expected structure
    for (const [key, skill] of Object.entries(this.characterData.skills)) {
      tempActor.system.skills[key] = {
        trained: skill.trained || false,
        focused: skill.focused || false
      };
    }

    return tempActor;
  }

  _recalcAbilities() {
    for (const [k, v] of Object.entries(this.characterData.abilities)) {
      v.total = (Number(v.base || 10) + Number(v.racial || 0) + Number(v.temp || 0));
      v.mod = Math.floor((v.total - 10) / 2);
    }
  }

  _recalcDefenses() {
    const halfLevel = Math.floor(this.characterData.level / 2);
    
    // Fortitude: 10 + level/2 + CON or STR (whichever is higher) + class bonus + misc
    const fortAbility = Math.max(
      this.characterData.abilities.con.mod || 0,
      this.characterData.abilities.str.mod || 0
    );
    this.characterData.defenses.fortitude.total = 
      10 + halfLevel + fortAbility + 
      this.characterData.defenses.fortitude.classBonus + 
      this.characterData.defenses.fortitude.misc;
    
    // Reflex: 10 + level/2 + DEX + class bonus + misc
    this.characterData.defenses.reflex.total = 
      10 + halfLevel + (this.characterData.abilities.dex.mod || 0) + 
      this.characterData.defenses.reflex.classBonus + 
      this.characterData.defenses.reflex.misc;
    
    // Will: 10 + level/2 + WIS + class bonus + misc
    this.characterData.defenses.will.total = 
      10 + halfLevel + (this.characterData.abilities.wis.mod || 0) + 
      this.characterData.defenses.will.classBonus + 
      this.characterData.defenses.will.misc;
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

  // ========================================
  // FINISH & CREATE ACTOR
  // ========================================
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

  /**
   * Open the shop for the created character
   * @param {Event} event - Click event
   * @private
   */
  async _onOpenShop(event) {
    event.preventDefault();

    // Ensure character has been created
    if (!this.actor) {
      this._finalizeCharacter();
      await this._createActor();
    }

    // Import and open the store
    try {
      const { SWSEStore } = await import('./store.js');
      const store = new SWSEStore(this.actor);
      store.render(true);
    } catch (err) {
      console.error("SWSE | Failed to open store:", err);
      ui.notifications.error("Failed to open the shop. You can access it from your character sheet.");
    }
  }

  /**
   * Apply starting class features to a newly created character
   * @param {Actor} actor - The actor to apply features to
   * @param {Object} classDoc - The class document from packs
   */
  async _applyStartingClassFeatures(actor, classDoc) {
    if (!classDoc || !classDoc.system) {
      console.warn("CharGen | No class document provided for feature application");
      return;
    }

    const featureItems = [];
    const weaponItems = [];
    console.log(`CharGen | Applying starting features for ${classDoc.name}`);

    // Apply starting_features array
    if (classDoc.system.starting_features && Array.isArray(classDoc.system.starting_features)) {
      for (const feature of classDoc.system.starting_features) {
        console.log(`CharGen | Auto-applying starting feature: ${feature.name} (${feature.type})`);

        const featureItem = {
          name: feature.name,
          type: "feat",
          img: feature.img || "icons/svg/upgrade.svg",
          system: {
            description: feature.description || `Starting feature from ${classDoc.name}`,
            source: `${classDoc.name} (Starting)`,
            type: feature.type || "class_feature"
          }
        };

        featureItems.push(featureItem);
      }
    }

    // Apply level 1 features from level_progression
    const levelProgression = classDoc.system.level_progression;
    if (levelProgression && Array.isArray(levelProgression)) {
      const level1Data = levelProgression.find(lp => lp.level === 1);

      if (level1Data && level1Data.features) {
        for (const feature of level1Data.features) {
          // Skip talent_choice and feat_grant as these are handled via selection UI
          if (feature.type === 'talent_choice' || feature.type === 'feat_grant') {
            continue;
          }

          // Special handling for Lightsaber - grant actual weapon item
          if (feature.name === 'Lightsaber' && feature.type === 'class_feature') {
            console.log(`CharGen | Auto-granting Lightsaber weapon for Jedi`);

            // Load lightsaber from weapons pack
            const weaponsPack = game.packs.get("swse.weapons");
            if (weaponsPack) {
              const docs = await weaponsPack.getDocuments();
              const lightsaber = docs.find(d => d.name === "Lightsaber");
              if (lightsaber) {
                weaponItems.push(lightsaber.toObject());
              } else {
                console.warn("CharGen | Lightsaber weapon not found in compendium");
              }
            }
            continue; // Don't create a feat for this, we're giving the actual weapon
          }

          // Apply proficiencies and class features
          if (feature.type === 'proficiency' || feature.type === 'class_feature') {
            console.log(`CharGen | Auto-applying level 1 feature: ${feature.name} (${feature.type})`);

            const featureItem = {
              name: feature.name,
              type: "feat",
              img: feature.img || "icons/svg/upgrade.svg",
              system: {
                description: feature.description || `Class feature from ${classDoc.name} level 1`,
                source: `${classDoc.name} 1`,
                type: feature.type
              }
            };

            featureItems.push(featureItem);
          }
        }
      }
    }

    // Create all feature items at once
    if (featureItems.length > 0) {
      console.log(`CharGen | Creating ${featureItems.length} class feature items`);
      await actor.createEmbeddedDocuments("Item", featureItems);
      ui.notifications.info(`Granted ${featureItems.length} class features from ${classDoc.name}`);
    }

    // Create weapon items
    if (weaponItems.length > 0) {
      console.log(`CharGen | Creating ${weaponItems.length} starting weapon items`);
      await actor.createEmbeddedDocuments("Item", weaponItems);
      ui.notifications.info(`Granted starting equipment: ${weaponItems.map(w => w.name).join(', ')}`);
    }
  }

  async _createActor() {
    // Build proper actor data structure matching SWSEActorSheet expectations
    const system = {
      level: this.characterData.level,
      race: this.characterData.species,
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
      credits: this.characterData.credits || 1000,
      weapons: [],
      // Species data
      specialAbilities: this.characterData.specialAbilities || [],
      languages: this.characterData.languages || [],
      racialSkillBonuses: this.characterData.racialSkillBonuses || [],
      speciesSource: this.characterData.speciesSource || ""
    };

    const actorData = {
      name: this.characterData.name || "Unnamed Character",
      type: "character",
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

      if (items.length > 0) {
        await created.createEmbeddedDocuments("Item", items);
      }

      // Apply starting class features (weapon proficiencies, class features, etc.)
      if (this.characterData.classes && this.characterData.classes.length > 0) {
        const className = this.characterData.classes[0].name;
        const classDoc = this._packs.classes.find(c => c.name === className || c._id === className);
        if (classDoc) {
          await this._applyStartingClassFeatures(created, classDoc);
        }
      }

      // Save character generation data to flags for reference
      await created.setFlag("swse", "chargenData", this.characterData);

      // Open the character sheet
      created.sheet.render(true);

      ui.notifications.info(`Character ${this.characterData.name} created successfully!`);
    } catch (err) {
      console.error("chargen: actor creation failed", err);
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
}