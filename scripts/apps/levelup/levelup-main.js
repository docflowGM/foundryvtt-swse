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
      draggable: true,
      scrollY: [".tab-content", ".window-content"],
      tabs: [{ navSelector: '.tabs', contentSelector: '.tab-content', initial: 'class' }],
      submitOnChange: false,
      closeOnSubmit: false,
      left: null,  // Allow Foundry to center
      top: null    // Allow Foundry to center
    });
  }

  /**
   * Detect if character is incomplete and determine which step to start at
   * @param {Actor} actor - The actor to check
   * @returns {string|null} The step to start at, or null if character is complete
   * @private
   */
  _detectIncompleteCharacter(actor) {
    const system = actor.system;

    // Check if character is level 0 (brand new)
    if ((system.level || 0) === 0) {
      return 'name';
    }

    // Check if character has a name
    if (!actor.name || actor.name.trim() === '' || actor.name === 'New Character') {
      return 'name';
    }

    // Check if character has a class
    const hasClass = actor.items.some(item => item.type === 'class');
    if (!hasClass) {
      // Check if they have a species first
      const hasSpecies = system.species && system.species.trim() !== '';
      if (!hasSpecies) {
        return 'type'; // Start at type selection (living vs droid)
      }
      return 'class';
    }

    // If we get here, character has level >= 1, name, and class
    // This is complete enough for level up
    return null;
  }

  constructor(actor, options = {}) {
    super(actor, options);
    this.actor = actor;

    // Check if character is incomplete and redirect to character generator
    const incompleteStep = this._detectIncompleteCharacter(actor);
    if (incompleteStep) {
      ui.notifications.info("Character appears incomplete. Opening Character Generator to complete setup...");
      // Import CharacterGenerator dynamically to avoid circular dependency
      import('../chargen/chargen-main.js').then(module => {
        const CharacterGenerator = module.default;
        const chargen = new CharacterGenerator(actor);
        chargen.currentStep = incompleteStep;
        chargen.render(true);
      });
      throw new Error("Character incomplete - redirecting to character generator");
    }

    this.currentStep = 'class'; // class, multiclass-bonus, ability-increase, feat, talent, skills, summary

    this.selectedClass = null;
    this.selectedTalent = null;
    this.selectedFeats = [];
    this.selectedSkills = [];
    this.abilityIncreases = {}; // Track ability score increases
    this.hpGain = 0;
    this.talentData = null;
    this.featData = null;
    this.activeTags = []; // Track active tag filters
    this.freeBuild = false; // Free Build mode - skips validation

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
    // Pass categorized feats to template
    data.featCategories = this.featData?.categories || [];
    data.availableFeats = this.featData?.feats?.filter(f => f.isQualified) || [];
    data.allFeats = this.featData?.feats || [];  // For debugging/info
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

    // Free Build mode flag
    data.freeBuild = this.freeBuild;

    // Progress indicator data
    const currentClasses = getCharacterClasses(this.actor);
    const isMulticlassing = this.selectedClass && Object.keys(currentClasses).length > 0 && !currentClasses[this.selectedClass.name];
    const isBase = this.selectedClass && isBaseClass(this.selectedClass.name);

    data.showMulticlassBonus = isMulticlassing && isBase;
    data.getsTalent = this.selectedClass && getsTalent(this.selectedClass, this.actor);

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

  activateListeners(html) {
    super.activateListeners(html);

    // Class selection (old and new styles)
    html.find('.select-class-btn').click(this._onSelectClass.bind(this));
    html.find('.class-choice-btn').click(this._onSelectClass.bind(this));

    // Prestige class navigation
    html.find('.show-prestige-btn').click(this._onShowPrestigeClasses.bind(this));
    html.find('.back-to-base-classes').click(this._onBackToBaseClasses.bind(this));

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
    html.find('.skip-step').click(this._onSkipStep.bind(this));

    // Free Build mode toggle
    html.find('.free-build-toggle').change(this._onToggleFreeBuild.bind(this));

    // Final level up
    html.find('.complete-levelup').click(this._onCompleteLevelUp.bind(this));

    // Feat category toggle
    html.find('.category-header').click(this._onToggleFeatCategory.bind(this));

    // Feat search and filtering
    html.find('.feat-search-input').on('input', this._onFeatSearch.bind(this));
    html.find('.clear-search-btn').click(this._onClearSearch.bind(this));
    html.find('.clear-filters-btn').click(this._onClearAllFilters.bind(this));
    html.find('.show-unavailable-toggle').change(this._onToggleShowUnavailable.bind(this));

    // Tag filtering
    html.find('.feat-tag').click(this._onClickFeatTag.bind(this));
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

    const featData = this.featData?.feats || [];
    const feat = selectBonusFeat(featId, featData, this.selectedFeats);
    if (!feat) return;

    // Check for duplicates - character already has this feat
    const alreadyHas = this.actor.items.some(i =>
      i.type === 'feat' && (i.name === feat.name || i._id === feat._id || i._id === featId)
    );

    // Check if already selected in this level-up session
    const alreadySelected = this.selectedFeats.some(f =>
      f.name === feat.name || f._id === feat._id || f._id === featId
    );

    if (alreadyHas) {
      ui.notifications.warn(`You already have the feat "${feat.name}"!`);
      return;
    }

    if (alreadySelected) {
      ui.notifications.warn(`You've already selected "${feat.name}" this level!`);
      return;
    }

    this.selectedFeats.push(feat);
    ui.notifications.info(`Selected feat: ${feat.name}`);
    await this.render();
  }

  // ========================================
  // FEAT FILTERING AND SEARCH
  // ========================================

  _onToggleFeatCategory(event) {
    event.preventDefault();
    event.stopPropagation();
    const categoryElement = $(event.currentTarget).closest('.feat-category');
    const categoryFeats = categoryElement.find('.category-feats');

    categoryElement.toggleClass('expanded');
    categoryFeats.slideToggle(200);
  }

  _onFeatSearch(event) {
    const searchTerm = event.target.value.toLowerCase().trim();
    const html = $(this.element);
    const clearBtn = html.find('.clear-search-btn');

    // Show/hide clear button
    clearBtn.toggle(searchTerm.length > 0);

    // Get all feat cards
    const featCards = html.find('.feat-card');

    if (!searchTerm) {
      // Show all feats if search is empty
      featCards.show();
      this._updateCategoryCounts(html);
      return;
    }

    // Filter feats by name or tags
    featCards.each((i, card) => {
      const $card = $(card);
      const featName = $card.data('feat-name')?.toLowerCase() || '';
      const featTags = $card.data('feat-tags')?.toLowerCase() || '';

      const matches = featName.includes(searchTerm) || featTags.includes(searchTerm);
      $card.toggle(matches);
    });

    // Update category counts
    this._updateCategoryCounts(html);

    // Expand categories that have visible feats
    html.find('.feat-category').each((i, category) => {
      const $category = $(category);
      const visibleFeats = $category.find('.feat-card:visible').length;
      if (visibleFeats > 0 && searchTerm) {
        $category.addClass('expanded');
        $category.find('.category-feats').show();
      }
    });
  }

  _onClearSearch(event) {
    event.preventDefault();
    const html = $(this.element);
    const searchInput = html.find('.feat-search-input');

    searchInput.val('');
    html.find('.clear-search-btn').hide();
    html.find('.feat-card').show();

    this._updateCategoryCounts(html);
  }

  _onClearAllFilters(event) {
    event.preventDefault();
    const html = $(this.element);

    // Clear search
    html.find('.feat-search-input').val('');
    html.find('.clear-search-btn').hide();

    // Clear active tags
    this.activeTags = [];
    html.find('.active-tag-filters').hide();
    html.find('.active-tags-container').empty();

    // Show all feats
    html.find('.feat-card').show();

    this._updateCategoryCounts(html);
  }

  _onToggleShowUnavailable(event) {
    const html = $(this.element);
    const showUnavailable = event.target.checked;

    // CSS handles the visibility via the checkbox state
    // Just need to update counts
    this._updateCategoryCounts(html);
  }

  _onClickFeatTag(event) {
    event.preventDefault();
    event.stopPropagation();

    const tag = $(event.currentTarget).data('tag');
    if (!tag) return;

    const html = $(this.element);

    // Initialize active tags if needed
    if (!this.activeTags) {
      this.activeTags = [];
    }

    // Toggle tag
    const tagIndex = this.activeTags.indexOf(tag);
    if (tagIndex > -1) {
      this.activeTags.splice(tagIndex, 1);
    } else {
      this.activeTags.push(tag);
    }

    // Update active tags display
    this._updateActiveTagsDisplay(html);

    // Filter feats by active tags
    this._filterByActiveTags(html);
  }

  _updateActiveTagsDisplay(html) {
    const activeFilters = html.find('.active-tag-filters');
    const container = html.find('.active-tags-container');

    if (!this.activeTags || this.activeTags.length === 0) {
      activeFilters.hide();
      container.empty();
      return;
    }

    activeFilters.show();
    container.empty();

    this.activeTags.forEach(tag => {
      const badge = $(`
        <span class="active-tag-badge">
          ${tag}
          <i class="fas fa-times" data-remove-tag="${tag}"></i>
        </span>
      `);

      badge.find('i').click((e) => {
        e.preventDefault();
        const tagToRemove = $(e.currentTarget).data('remove-tag');
        const index = this.activeTags.indexOf(tagToRemove);
        if (index > -1) {
          this.activeTags.splice(index, 1);
        }
        this._updateActiveTagsDisplay(html);
        this._filterByActiveTags(html);
      });

      container.append(badge);
    });
  }

  _filterByActiveTags(html) {
    if (!this.activeTags || this.activeTags.length === 0) {
      // No active tags - show all feats
      html.find('.feat-card').show();
      this._updateCategoryCounts(html);
      return;
    }

    // Filter feats: show only if they have ALL active tags
    html.find('.feat-card').each((i, card) => {
      const $card = $(card);
      const featTags = ($card.data('feat-tags') || '').split(',').filter(t => t);

      const hasAllTags = this.activeTags.every(activeTag =>
        featTags.includes(activeTag)
      );

      $card.toggle(hasAllTags);
    });

    // Update category counts
    this._updateCategoryCounts(html);

    // Expand categories that have visible feats
    html.find('.feat-category').each((i, category) => {
      const $category = $(category);
      const visibleFeats = $category.find('.feat-card:visible').length;
      if (visibleFeats > 0) {
        $category.addClass('expanded');
        $category.find('.category-feats').show();
      }
    });
  }

  _updateCategoryCounts(html) {
    html.find('.feat-category').each((i, category) => {
      const $category = $(category);
      const visibleCount = $category.find('.feat-card:visible').length;
      const totalCount = $category.find('.feat-card').length;

      $category.find('.count-badge').text(visibleCount === totalCount ? totalCount : `${visibleCount}/${totalCount}`);
    });
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

  /**
   * Navigate to prestige class selection screen
   */
  _onShowPrestigeClasses(event) {
    event.preventDefault();
    this.currentStep = 'prestige';
    this.render();
  }

  /**
   * Navigate back to base class selection screen
   */
  _onBackToBaseClasses(event) {
    event.preventDefault();
    this.currentStep = 'class';
    this.render();
  }

  // ========================================
  // MULTICLASS BONUS
  // ========================================

  async _onSelectMulticlassFeat(event) {
    event.preventDefault();
    const featId = event.currentTarget.dataset.featId;

    const feat = await selectMulticlassFeat(featId);
    if (!feat) return;

    // Check for duplicates - character already has this feat
    const alreadyHas = this.actor.items.some(i =>
      i.type === 'feat' && (i.name === feat.name || i._id === feat._id || i._id === featId)
    );

    if (alreadyHas) {
      ui.notifications.warn(`You already have the feat "${feat.name}"!`);
      return;
    }

    this.selectedFeats = [feat];
    ui.notifications.info(`Selected feat: ${feat.name}`);
    await this.render();
  }

  async _onSelectMulticlassSkill(event) {
    event.preventDefault();
    const skillKey = event.currentTarget.dataset.skill;
    const skillName = event.currentTarget.dataset.skillName || skillKey;

    const skill = selectMulticlassSkill(skillKey, skillName);
    this.selectedSkills = [skill];
    ui.notifications.info(`Selected trained skill: ${skillName}`);
    await this.render();
  }

  // ========================================
  // ABILITY SCORE INCREASES
  // ========================================

  async _onAbilityIncrease(event) {
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

    // Re-filter feats with new ability scores if feat data is loaded
    // This ensures feats that require the increased ability score become available
    if (this.featData) {
      await this._loadFeats();
    }

    await this.render();
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
        // Check if multiclass bonus applies (only for multiclassing into a base class)
        const currentClasses = getCharacterClasses(this.actor);
        const isMulticlassing = this.selectedClass && Object.keys(currentClasses).length > 0 && !currentClasses[this.selectedClass.name];
        const isBase = this.selectedClass && isBaseClass(this.selectedClass.name);

        if (isMulticlassing && isBase) {
          this.currentStep = 'multiclass-bonus';
        } else if (getsAbilityIncr) {
          this.currentStep = 'ability-increase';
        } else if (getsBonusFt) {
          this.currentStep = 'feat';
        } else if (getsTal) {
          this.currentStep = 'talent';
        } else {
          this.currentStep = 'summary';
        }
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
        // Check if they've allocated all 2 points (unless in Free Build mode)
        const totalAllocated = Object.values(this.abilityIncreases).reduce((sum, val) => sum + val, 0);
        if (!this.freeBuild && totalAllocated < 2) {
          ui.notifications.warn("You must allocate all 2 ability points before continuing! (Or enable Free Build mode to skip)");
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
        // Check if they selected a feat (unless in Free Build mode)
        if (!this.freeBuild && this.selectedFeats.length === 0) {
          ui.notifications.warn("You must select a feat before continuing! (Or enable Free Build mode to skip)");
          return;
        }
        if (getsTal) {
          this.currentStep = 'talent';
        } else {
          this.currentStep = 'summary';
        }
        break;
      case 'talent':
        // Check if they selected a talent (unless in Free Build mode)
        if (!this.freeBuild && !this.selectedTalent) {
          ui.notifications.warn("You must select a talent before continuing! (Or enable Free Build mode to skip)");
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

  /**
   * Skip current step - forces navigation to next step without validation
   * Shows confirmation dialog first
   */
  async _onSkipStep(event) {
    event.preventDefault();

    const confirmed = await Dialog.confirm({
      title: 'Skip This Step?',
      content: `
        <div class="skip-warning">
          <p><i class="fas fa-exclamation-triangle"></i> <strong>Warning:</strong></p>
          <p>You are about to skip this step without completing it.</p>
          <p>You will be responsible for adding any missing selections later.</p>
          <p>Continue?</p>
        </div>
      `
    });

    if (!confirmed) return;

    // Temporarily enable freeBuild to skip validation
    const wasFreeBuild = this.freeBuild;
    this.freeBuild = true;
    this._onNextStep();
    this.freeBuild = wasFreeBuild;

    ui.notifications.warn('Step skipped - remember to fill in missing requirements!');
  }

  /**
   * Toggle Free Build mode
   */
  _onToggleFreeBuild(event) {
    this.freeBuild = event.target.checked;

    if (this.freeBuild) {
      Dialog.confirm({
        title: 'Enable Free Build Mode?',
        content: `
          <div class="free-build-warning">
            <p><i class="fas fa-unlock-alt"></i> <strong>Free Build Mode</strong></p>
            <p>This mode allows you to skip validation checks and build your character freely.</p>
            <p><strong>You are responsible for:</strong></p>
            <ul>
              <li>Meeting all prerequisites</li>
              <li>Following character creation rules</li>
              <li>Adding missing selections later</li>
            </ul>
            <p>Enable Free Build Mode?</p>
          </div>
        `,
        yes: () => {
          this.freeBuild = true;
          this.render();
          ui.notifications.info('Free Build Mode enabled');
        },
        no: () => {
          this.freeBuild = false;
          event.target.checked = false;
          ui.notifications.info('Free Build Mode disabled');
        }
      });
    } else {
      ui.notifications.info('Free Build Mode disabled');
      this.render();
    }
  }

  // ========================================
  // COMPLETE LEVEL UP
  // ========================================

  async _onCompleteLevelUp(event) {
    event.preventDefault();

    // Validation before attempting level up
    if (!this.selectedClass) {
      ui.notifications.error("You must select a class before completing level up.");
      return;
    }

    try {
      // If this is level 1, save the starting class for mentor system
      if (this.actor.system.level === 1) {
        await setLevel1Class(this.actor, this.selectedClass.name);
      }

      // Create or update class item
      const classLevel = await createOrUpdateClassItem(this.selectedClass, this.actor);
      if (!classLevel) {
        throw new Error("Failed to create or update class item");
      }
      SWSELogger.log(`SWSE LevelUp | Class item created/updated to level ${classLevel}`);

      // Add selected talent if any
      if (this.selectedTalent) {
        try {
          const talentObject = typeof this.selectedTalent.toObject === 'function'
            ? this.selectedTalent.toObject()
            : this.selectedTalent;
          const createdTalent = await this.actor.createEmbeddedDocuments("Item", [talentObject]);
          if (!createdTalent || createdTalent.length === 0) {
            throw new Error(`Failed to add talent: ${this.selectedTalent.name}`);
          }
          SWSELogger.log(`SWSE LevelUp | Added talent: ${this.selectedTalent.name}`);
        } catch (talentError) {
          throw new Error(`Failed to add talent: ${talentError.message}`);
        }
      }

      // Add multiclass feats if any
      if (this.selectedFeats.length > 0) {
        try {
          const featObjects = this.selectedFeats.map(f =>
            typeof f.toObject === 'function' ? f.toObject() : f
          );
          const createdFeats = await this.actor.createEmbeddedDocuments("Item", featObjects);
          if (!createdFeats || createdFeats.length !== this.selectedFeats.length) {
            throw new Error(`Feat creation mismatch: expected ${this.selectedFeats.length}, got ${createdFeats?.length || 0}`);
          }
          SWSELogger.log(`SWSE LevelUp | Added ${createdFeats.length} feat(s)`);
        } catch (featError) {
          throw new Error(`Failed to add feats: ${featError.message}`);
        }
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
          // Support both object format {key, name} and string format (backward compatibility)
          const skillKey = typeof skill === 'string' ? skill : skill.key;
          updates[`system.skills.${skillKey}.trained`] = true;
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

      // Provide specific error message based on error type
      let errorMessage = "Failed to complete level up";
      if (err.message) {
        // Extract meaningful error messages
        if (err.message.includes("talent")) {
          errorMessage = `Talent Error: ${err.message}`;
        } else if (err.message.includes("feat")) {
          errorMessage = `Feat Error: ${err.message}`;
        } else if (err.message.includes("class")) {
          errorMessage = `Class Error: ${err.message}`;
        } else if (err.message.includes("skill")) {
          errorMessage = `Skill Error: ${err.message}`;
        } else if (err.message.includes("ability")) {
          errorMessage = `Ability Score Error: ${err.message}`;
        } else {
          errorMessage = `${errorMessage}: ${err.message}`;
        }
      }

      ui.notifications.error(errorMessage, { permanent: true });
      ui.notifications.warn("Your character may be in an inconsistent state. Please check your character sheet and contact the GM if needed.");

      // Re-render to show current state
      this.render();
    }
  }

  async _updateObject(event, formData) {
    // Not used - level up is handled by _onCompleteLevelUp
  }
}
