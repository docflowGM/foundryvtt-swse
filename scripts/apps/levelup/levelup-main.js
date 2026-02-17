/**
 * SWSE Enhanced Level Up System - Main Application
 * Main orchestration class that coordinates all level-up modules
 * - Multi-classing support with feat/skill choices
 * - Prestige class integration
 * - Visual talent tree selection
 * - Class prerequisite checking
 * - Mentor-based narration system
 *
 * NOTE: This system now uses SWSEProgressionEngine as the single source of truth
 * for all progression data. All selections are tracked through the engine and
 * applied via engine.finalize() at completion.
 */

import { SWSEProgressionEngine } from '../../engine/progression.js';
import { SWSELogger, swseLogger } from '../../utils/logger.js';
import { isEpicOverrideEnabled } from '../../settings/epic-override.js';
import { getLevelSplit } from '../../actors/derived/level-split.js';
import { getMentorForClass, getMentorGreeting, getMentorGuidance, getLevel1Class, setLevel1Class } from '../mentor/mentor-dialogues.js';
import { MentorSurvey } from '../mentor/mentor-survey.js';
import { createChatMessage } from '../../core/document-api-v13.js';
import { HouseRuleTalentCombination } from '../../houserules/houserule-talent-combination.js';
import { TypingAnimation } from '../../utils/typing-animation.js';
import { qs, qsa, setVisible, isVisible } from '../../utils/dom-utils.js';

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
  getAvailableTalentTrees,
  loadTalentData,
  showEnhancedTreeSelection,
  showEnhancedTalentTree,
  showTalentTreeDialog,
  selectTalent
} from './levelup-talents.js';

// Import force power module functions
import {
  getsForcePowers,
  countForcePowersGained,
  loadForcePowers,
  selectForcePower
} from './levelup-force-powers.js';

// Import dual talent selection
import {
  getTalentSelectionState,
  getHeroicTalentTrees,
  getClassTalentTrees,
  recordTalentSelection,
  checkTalentSelectionsComplete,
  getTalentSelectionDisplay
} from './levelup-dual-talent-selection.js';

// Import skill module functions
import {
  selectMulticlassSkill,
  applyTrainedSkills,
  checkIntModifierIncrease
} from './levelup-skills.js';

// Import suggestion and roadmap features
import { showPrestigeRoadmap } from './prestige-roadmap.js';
import { showGMDebugPanel } from './debug-panel.js';
import { PathPreview } from '../../engine/PathPreview.js';
import { findActiveSynergies } from '../../engine/CommunityMetaSynergies.js';
import { MentorSuggestionVoice } from '../../mentor/mentor-suggestion-voice.js';
import { MentorSuggestionDialog } from '../mentor/mentor-suggestion-dialog.js';
import { PrerequisiteChecker } from '../../data/prerequisite-checker.js';

// Import mentor memory system
import { decayAllMentorCommitments, updateAllMentorMemories } from '../../mentor/mentor-memory.js';

// Import mentor wishlist integration
import { MentorWishlistIntegration } from '../../engine/MentorWishlistIntegration.js';

// V2 API base class
import SWSEFormApplicationV2 from '../base/swse-form-application-v2.js';

export class SWSELevelUpEnhanced extends SWSEFormApplicationV2 {

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
      classes: ['swse', 'levelup-dialog', 'swse-app'],
      width: 800,
      height: 600,
      resizable: true,
      draggable: true,
      scrollY: ['.tab-content', '.window-content'],
      tabs: [{ navSelector: '.tabs', contentSelector: '.tab-content', initial: 'class' }],
      submitOnChange: false,
      closeOnSubmit: false,
      left: null,  // Allow Foundry to center
      top: null    // Allow Foundry to center
    });

  static PARTS = {
    content: {
      template: 'systems/foundryvtt-swse/templates/apps/levelup.hbs'
    }
  };

  /**
   * Canonical entry point for opening level up UI
   * @param {Actor} actor - The actor to level up
   * @returns {SWSELevelUpEnhanced} The level up dialog instance
   */
  static async showForActor(actor) {
    const dialog = new SWSELevelUpEnhanced(actor);
    dialog.render({ force: true });
    return dialog;
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
    super(options);
    this.actor = actor;
    this.actor = actor;

    // Check if character is incomplete and redirect to character generator
    const incompleteStep = this._detectIncompleteCharacter(actor);
    if (incompleteStep) {
      ui.notifications.info('Character appears incomplete. Opening Character Generator to complete setup...');
      // Import CharacterGenerator dynamically to avoid circular dependency
      import('../chargen/chargen-main.js').then(module => {
        const CharacterGenerator = module.default;
        const chargen = new CharacterGenerator(actor);
        chargen.currentStep = incompleteStep;
        chargen.render(true);
      });
      throw new Error('Character incomplete - redirecting to character generator');
    }

    this.currentStep = 'class'; // class, multiclass-bonus, ability-increase, feat, force-powers, talent, skills, summary

    this.selectedClass = null;
    this.selectedTalents = { heroic: null, class: null }; // Dual talent progression
    this.currentTalentSelectionType = null; // Track which talent type we're selecting ('heroic' or 'class')
    this.selectedFeats = [];
    this.selectedForcePowers = [];
    this.selectedSkills = [];
    this.abilityIncreases = {}; // Track ability score increases
    this.hpGain = 0;
    this.talentData = null;
    this.featData = null;
    this.forcePowerData = null;
    this.activeTags = []; // Track active tag filters
    this.freeBuild = false; // Free Build mode - skips validation

    // PHASE B: Performance optimization - render debouncing
    this._pendingRender = false;
    this._renderTimeout = null;
    this._eventListeners = [];
    this._lastSuggestionHash = null;
    this._cachedSuggestions = null;

    // Initialize progression engine in levelup mode
    // This is the single source of truth for all progression data
    this.progressionEngine = new SWSEProgressionEngine(actor, 'levelup');
    this.progressionEngine.loadStateFromActor();

    // Clear suggestion cache for fresh suggestions in this level-up session
    this.progressionEngine.clearSuggestionCache();

    swseLogger.log('SWSE LevelUp | Initialized progression engine in levelup mode');

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

  /**
   * PHASE B: Debounce render calls to prevent lag
   * Queues render but only executes once per 100ms
   */
  _debounceRender() {
    if (this._pendingRender) return;
    this._pendingRender = true;

    if (this._renderTimeout) clearTimeout(this._renderTimeout);
    this._renderTimeout = setTimeout(() => {
      this._debounceRender();
      this._pendingRender = false;
    }, 100);
  }

  /**
   * PHASE B: Bind event listeners with cleanup tracking
   * Replaces inline addEventListener calls, enables proper cleanup
   */
  _bindEventListeners() {
    // Clear previous listeners first
    this._eventListeners.forEach(({ el, event, handler }) => {
      el.removeEventListener(event, handler);
    });
    this._eventListeners = [];

    const root = this.element;
    const qsa = (el, sel) => el.querySelectorAll(sel);

    // Helper to track listener binding
    const addListener = (selector, eventName, handler) => {
      qsa(root, selector).forEach(el => {
        const boundHandler = handler.bind(this);
        el.addEventListener(eventName, boundHandler);
        this._eventListeners.push({ el, event: eventName, handler: boundHandler });
      });
    };

    // Comprehensive event listener binding for levelup UI
    addListener('.select-class-btn', 'click', this._onSelectClass);
    addListener('.class-choice-btn', 'click', this._onSelectClass);
    addListener('.show-prestige-btn', 'click', this._onShowPrestigeClasses);
    addListener('.back-to-base-classes', 'click', this._onBackToBaseClasses);
    addListener('.select-feat-btn', 'click', this._onSelectMulticlassFeat);
    addListener('.select-skill-btn', 'click', this._onSelectMulticlassSkill);
    addListener('.ability-increase-btn', 'click', this._onAbilityIncrease);
    addListener('.ask-mentor-attribute', 'click', this._onAskMentorAttributeSuggestion);
    addListener('.select-bonus-feat', 'click', this._onSelectBonusFeat);
    addListener('.select-force-power', 'click', this._onSelectForcePower);
    addListener('.select-talent-tree', 'click', this._onSelectTalentTree);
    addListener('.next-step', 'click', this._onNextStep);
    addListener('.prev-step', 'click', this._onPrevStep);
    addListener('.skip-step', 'click', this._onSkipStep);
    addListener('.free-build-toggle', 'change', this._onToggleFreeBuild);
    addListener('.complete-levelup', 'click', this._onCompleteLevelUp);
    addListener('.category-header', 'click', this._onToggleFeatCategory);
    addListener('.feat-search-input', 'input', this._onFeatSearch);
    addListener('.clear-search-btn', 'click', this._onClearSearch);
    addListener('.clear-filters-btn', 'click', this._onClearAllFilters);
    addListener('.show-unavailable-toggle', 'change', this._onToggleShowUnavailable);
    addListener('.feat-tag', 'click', this._onClickFeatTag);
    addListener('.show-prestige-roadmap', 'click', this._onShowPrestigeRoadmap);
    addListener('.show-gm-debug-panel', 'click', this._onShowGMDebugPanel);
    addListener('.ask-mentor-class-suggestion', 'click', this._onAskMentorClassSuggestion);
    addListener('.ask-mentor-feat-suggestion', 'click', this._onAskMentorFeatSuggestion);
    addListener('.ask-mentor-talent-suggestion', 'click', this._onAskMentorTalentSuggestion);
    addListener('.ask-mentor-force-power-suggestion', 'click', this._onAskMentorForcePowerSuggestion);
  }

  /**
   * PHASE B: Comprehensive event listener binding (all listeners tracked)
   * Replaces inline addEventListener calls from _onRender (original lines 464-519)
   */
  _bindEventListenersComprehensive() {
    // Clear previous listeners
    this._eventListeners.forEach(({ el, event, handler }) => {
      el.removeEventListener(event, handler);
    });
    this._eventListeners = [];

    const root = this.element;
    const qsa = (el, sel) => el.querySelectorAll(sel);

    const addListener = (selector, eventName, handler) => {
      qsa(root, selector).forEach(el => {
        const boundHandler = handler.bind(this);
        el.addEventListener(eventName, boundHandler);
        this._eventListeners.push({ el, event: eventName, handler: boundHandler });
      });
    };

    // All listeners from original _onRender (lines 464-519)
    addListener('.select-class-btn', 'click', this._onSelectClass);
    addListener('.class-choice-btn', 'click', this._onSelectClass);
    addListener('.show-prestige-btn', 'click', this._onShowPrestigeClasses);
    addListener('.back-to-base-classes', 'click', this._onBackToBaseClasses);
    addListener('.select-feat-btn', 'click', this._onSelectMulticlassFeat);
    addListener('.select-skill-btn', 'click', this._onSelectMulticlassSkill);
    addListener('.ability-increase-btn', 'click', this._onAbilityIncrease);
    addListener('.ask-mentor-attribute', 'click', this._onAskMentorAttributeSuggestion);
    addListener('.select-bonus-feat', 'click', this._onSelectBonusFeat);
    addListener('.select-force-power', 'click', this._onSelectForcePower);
    addListener('.select-talent-tree', 'click', this._onSelectTalentTree);
    addListener('.next-step', 'click', this._onNextStep);
    addListener('.prev-step', 'click', this._onPrevStep);
    addListener('.skip-step', 'click', this._onSkipStep);
    addListener('.free-build-toggle', 'change', this._onToggleFreeBuild);
    addListener('.complete-levelup', 'click', this._onCompleteLevelUp);
    addListener('.category-header', 'click', this._onToggleFeatCategory);
    addListener('.feat-search-input', 'input', this._onFeatSearch);
    addListener('.clear-search-btn', 'click', this._onClearSearch);
    addListener('.clear-filters-btn', 'click', this._onClearAllFilters);
    addListener('.show-unavailable-toggle', 'change', this._onToggleShowUnavailable);
    addListener('.feat-tag', 'click', this._onClickFeatTag);
    addListener('.show-prestige-roadmap', 'click', this._onShowPrestigeRoadmap);
    addListener('.show-gm-debug-panel', 'click', this._onShowGMDebugPanel);
    addListener('.ask-mentor-class-suggestion', 'click', this._onAskMentorClassSuggestion);
    addListener('.ask-mentor-feat-suggestion', 'click', this._onAskMentorFeatSuggestion);
    addListener('.ask-mentor-talent-suggestion', 'click', this._onAskMentorTalentSuggestion);
    addListener('.ask-mentor-force-power-suggestion', 'click', this._onAskMentorForcePowerSuggestion);
  }

  async _prepareContext() {
    const data = await super._prepareContext();

    // Use this.object (managed by FormApplication) to ensure fresh actor data
    // Force a data preparation to ensure abilities are up-to-date
    const actor = this.object;
    if (actor && typeof actor.prepareData === 'function') {
      actor.prepareData();
    }

    data.actor = actor;

    const { heroicLevel, totalLevel } = getLevelSplit(actor);
    data.heroicLevel = heroicLevel;
    data.totalLevel = totalLevel || Number(actor.system.level) || heroicLevel;

    data.currentLevel = actor.system.level;
    data.newLevel = actor.system.level + 1;
    data.currentStep = this.currentStep;

    data.epicOverrideEnabled = isEpicOverrideEnabled();
    data.epicBlocked = (Number(data.newLevel) || 0) > 20 && !data.epicOverrideEnabled;
    data.epicAdvisory = (Number(data.newLevel) || 0) > 20 && data.epicOverrideEnabled;

    this._epicBlocked = data.epicBlocked;
    this._epicAdvisory = data.epicAdvisory;

    // Get available classes
    const pendingData = {
      selectedFeats: this.selectedFeats,
      selectedClass: this.selectedClass,
      abilityIncreases: this.abilityIncreases,
      selectedSkills: this.selectedSkills,
      newLevel: data.newLevel,
      plannedHeroicLevel: data.newLevel,
      epicAdvisory: data.epicAdvisory
    };
    data.availableClasses = await getAvailableClasses(this.actor, pendingData);

    // Check if there are any suggested classes
    data.hasSuggestedClasses = data.availableClasses.some(c => c.isSuggested);

    // Get character's current classes
    data.characterClasses = getCharacterClasses(this.actor);

    // Multi-class bonus choice from houserules
    data.multiclassBonusChoice = game.settings.get('foundryvtt-swse', 'multiclassBonusChoice');

    // Talent tree restriction from houserules
    data.talentTreeRestriction = game.settings.get('foundryvtt-swse', 'talentTreeRestriction');

    // Ability increase settings
    data.abilityIncreaseMethod = game.settings.get('foundryvtt-swse', 'abilityIncreaseMethod') || 'flexible';
    data.getsAbilityIncrease = getsAbilityIncrease(data.newLevel);
    data.abilityIncreases = this.abilityIncreases;

    // Debug logging for ability scores
    if (data.getsAbilityIncrease) {
      SWSELogger.log('SWSE LevelUp | Current ability scores:', actor.system.attributes);
    }

    // Feat selection
    data.getsBonusFeat = getsBonusFeat(this.selectedClass, this.actor);
    if (data.getsBonusFeat && !this.featData) {
      // Load feats asynchronously if needed
      await this._loadFeats();
    }
    // Pass categorized feats to template
    data.featCategories = this.featData?.categories || [];
    data.availableFeats = this.featData?.feats?.filter(f => f.isQualified) || [];
    data.futureAvailableFeats = this.featData?.futureAvailableFeats || [];  // Feats that will be available soon
    data.allFeats = this.featData?.feats || [];  // For debugging/info
    data.selectedFeats = this.selectedFeats;

    // Force Power selection
    data.getsForcePowers = getsForcePowers(this.actor, this.selectedFeats);
    if (data.getsForcePowers && !this.forcePowerData) {
      await this._loadForcePowers();
    }
    data.forcePowerCount = data.getsForcePowers ? await countForcePowersGained(this.actor, this.selectedFeats) : 0;
    data.availableForcePowers = this.forcePowerData || [];
    data.selectedForcePowers = this.selectedForcePowers;

    // Mentor data
    data.mentor = this.mentor;
    data.mentorGreeting = this.mentorGreeting;
    data.mentorGuidance = this._getMentorGuidanceForCurrentStep();

    // If class selected, get talent trees and progression info
    if (this.selectedClass) {
      data.selectedClass = this.selectedClass;
      // Legacy: also get talent trees (used in template)
      data.talentTrees = await getAvailableTalentTrees(this.selectedClass, this.actor);

      // Dual talent progression
      const talentState = getTalentSelectionState(this.selectedClass, this.actor);
      data.talentState = talentState;
      data.selectedTalents = this.selectedTalents;
      data.talentSelectionDisplay = getTalentSelectionDisplay(this.selectedTalents);

      // Heroic talent trees (union of all class trees)
      data.heroicTalentTrees = await getHeroicTalentTrees(this.actor);
      // Class talent trees (only this class's trees)
      data.classTalentTrees = getClassTalentTrees(this.selectedClass);

      // Load talent tree descriptions for hover tooltips
      try {
        const response = await fetch('systems/foundryvtt-swse/data/talent-tree-descriptions.json');
        data.talentTreeDescriptions = await response.json();
      } catch (err) {
        console.warn('[LEVELUP] Failed to load talent tree descriptions:', err);
        data.talentTreeDescriptions = {};
      }
    }

    // Free Build mode flag
    data.freeBuild = this.freeBuild;

    // GM check for debug tools
    data.isGM = game.user.isGM;

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
      'force-powers': 'force_power',
      'summary': 'hp'
    };

    const choiceType = guidanceMap[this.currentStep] || 'class';
    return getMentorGuidance(this.mentor, choiceType);
  }

  async _onRender(context, options) {
    await super._onRender(context, options);

    const root = this.element;

    if (this._epicBlocked) {
      qsa(root, 'button').forEach(b => { b.disabled = true; });
      qsa(root, '.cancel-levelup, .close').forEach(b => { b.disabled = false; });
      return;
    }

    // PHASE B: Bind all event listeners with cleanup tracking
    // This replaces 50+ inline addEventListener calls (lines 464-519)
    // Now properly cleaned up on window close
    this._bindEventListenersComprehensive();

    // Animate mentor text with typing effect
    this._animateMentorText();

    // Suggestion diff (optional learning aid)
    try {
      const enabled = game.settings.get('foundryvtt-swse', 'showSuggestionDiffOnLevelUp') ?? false;
      if (enabled) {
        const panel = qs(root, '.swse-suggestion-diff');
        if (!panel) {
          (qs(root, '.window-content') ?? root).insertAdjacentHTML('afterbegin', `<div class="swse-suggestion-diff"><h4>Recommendation changes</h4><div class="swse-suggestion-diff__body">Loading…</div></div>`);
        }
        (async () => {
          const sugs = await SuggestionService.getSuggestions(this.actor, 'levelup', { persist: false });
          const diff = await SuggestionService.getSuggestionDiff(this.actor, 'levelup', sugs);
          const body = qs(root, '.swse-suggestion-diff__body');
          if (body) {body.innerHTML = '';}
          if (!diff.added.length && !diff.removed.length) {
            if (body) {body.insertAdjacentHTML('beforeend', `<div>No changes since last time.</div>`);}
          } else {
            if (diff.added.length && body) {body.insertAdjacentHTML('beforeend', `<div><strong>New:</strong> ${diff.added.slice(0,8).join(', ')}</div>`);}
            if (diff.removed.length && body) {body.insertAdjacentHTML('beforeend', `<div><strong>Gone:</strong> ${diff.removed.slice(0,8).join(', ')}</div>`);}
          }
        })();
      }
    } catch (err) {
      console.warn('SWSE | Suggestion diff failed:', err);
    }

  }

  /**
   * Animate mentor greeting and guidance text with typing effect
   * @private
   */
  _animateMentorText() {
    const greetingElement = qs(this.element, '.mentor-greeting p');
    const guidanceElement = qs(this.element, '.mentor-guidance p');

    // Animate greeting first
    if (greetingElement && this.mentorGreeting) {
      TypingAnimation.typeText(greetingElement, this.mentorGreeting, {
        speed: 45,
        skipOnClick: true,
        onComplete: () => {
          // Animate guidance after greeting completes
          if (guidanceElement) {
            const guidanceText = this._getMentorGuidanceForCurrentStep();
            TypingAnimation.typeText(guidanceElement, guidanceText, {
              speed: 45,
              skipOnClick: true
            });
          }
        }
      });
    } else if (guidanceElement) {
      // If no greeting, just animate guidance
      const guidanceText = this._getMentorGuidanceForCurrentStep();
      TypingAnimation.typeText(guidanceElement, guidanceText, {
        speed: 45,
        skipOnClick: true
      });
    }
  }

  /**
   * Show the Prestige Roadmap UI
   */
  async _onShowPrestigeRoadmap(event) {
    event.preventDefault();
    const pendingData = this._buildPendingData();
    showPrestigeRoadmap(this.actor, pendingData);
  }

  /**
   * Show the GM Debug Panel (GM only)
   */
  async _onShowGMDebugPanel(event) {
    event.preventDefault();
    if (!game.user.isGM) {
      ui.notifications.warn('Debug panel is only available to GMs');
      return;
    }
    const pendingData = this._buildPendingData();
    showGMDebugPanel(this.actor, pendingData);
  }

  /**
   * Ask mentor for feat suggestion
   */
  async _onAskMentorFeatSuggestion(event) {
    event.preventDefault();

    // Get available feats
    const availableFeats = (this.featData?.categories || [])
      .flatMap(cat => cat.feats)
      .filter(feat => !feat.isUnavailable && !feat.isSelected);

    if (availableFeats.length === 0) {
      ui.notifications.warn('No available feats to suggest.');
      return;
    }

    try {
      // Get suggestion from engine
      const pendingData = this._buildPendingData();
      let suggestions = await SuggestionService.getSuggestions(this.actor, 'levelup', { domain: 'feats', available: availableFeats, pendingData, persist: true });

      if (!suggestions || suggestions.length === 0) {
        ui.notifications.warn('No feat suggestions available at this time.');
        return;
      }

      // Enhance suggestions with wishlist consideration
      suggestions = MentorWishlistIntegration.enhanceSuggestionsWithWishlist(suggestions, this.actor);

      // Get the top suggestion
      const topSuggestion = suggestions[0];

      // Get mentor context considering wishlist
      const mentorContext = MentorWishlistIntegration.getMentorWishlistContext(topSuggestion, this.actor, this.mentor);

      // Show mentor dialog with suggestion (expects class key like "Jedi")
      const result = await MentorSuggestionDialog.show(this.currentMentorClass, topSuggestion, 'feat_selection');

      if (result && result.applied) {
        // Auto-select the feat
        const featId = topSuggestion._id;
        await this._onSelectBonusFeat({ currentTarget: { dataset: { featId } } });

        // Show mentor context if available
        if (mentorContext) {
          ui.notifications.info(mentorContext);
        } else {
          ui.notifications.info(`${this.mentor.name} suggests: ${topSuggestion.name}`);
        }
      }
    } catch (err) {
      console.error('Error getting feat suggestion:', err);
      ui.notifications.error('Error getting mentor suggestion. Check console.');
    }
  }

  /**
   * Ask mentor for class suggestion
   */
  async _onAskMentorClassSuggestion(event) {
    event.preventDefault();

    try {
      const pendingData = this._buildPendingData();
      const availableClasses = await getAvailableClasses(this.actor, pendingData, { includeSuggestions: true });

      if (!availableClasses || availableClasses.length === 0) {
        ui.notifications.warn('No available classes to suggest.');
        return;
      }

      // Get the highest-tier suggestion
      const topSuggestion = availableClasses.find(c => c.isSuggested) || availableClasses[0];

      // Show mentor suggestion
      await MentorSuggestionDialog.show(this.currentMentorClass, topSuggestion, 'class_selection');

      ui.notifications.info(`${this.mentor.name} suggests: ${topSuggestion.name}`);
    } catch (err) {
      console.error('Error getting class suggestion:', err);
      ui.notifications.error('Error getting mentor suggestion. Check console.');
    }
  }

  /**
   * Ask mentor for talent suggestion
   */
  async _onAskMentorTalentSuggestion(event) {
    event.preventDefault();

    try {
      // Load talent data if not already loaded
      if (!this.talentData) {
        this.talentData = await loadTalentData(this.actor, this._buildPendingData());
      }

      // Get available talent trees for the selected class
      const availableTrees = await getAvailableTalentTrees(this.selectedClass, this.actor);

      if (!availableTrees || availableTrees.length === 0) {
        ui.notifications.warn('No talent trees available for this class.');
        return;
      }

      // Filter talents to only include those from available trees and not already owned
      const ownedTalents = this.actor.items.filter(i => i.type === 'talent').map(t => t.name);
      const availableTalents = this.talentData.filter(talent => {
        const talentTree = talent.system?.tree || talent.tree;
        return availableTrees.includes(talentTree) && !ownedTalents.includes(talent.name);
      });

      if (availableTalents.length === 0) {
        ui.notifications.warn('No available talents to suggest.');
        return;
      }

      // Get suggestion from engine
      const pendingData = this._buildPendingData();
      let suggestions = await SuggestionService.getSuggestions(this.actor, 'levelup', { domain: 'talents', available: availableTalents, pendingData, persist: true });

      if (!suggestions || suggestions.length === 0) {
        ui.notifications.warn('No talent suggestions available at this time.');
        return;
      }

      // Enhance suggestions with wishlist consideration
      suggestions = MentorWishlistIntegration.enhanceSuggestionsWithWishlist(suggestions, this.actor);

      // Get the top suggestion
      const topSuggestion = suggestions[0];

      // Get mentor context considering wishlist
      const mentorContext = MentorWishlistIntegration.getMentorWishlistContext(topSuggestion, this.actor, this.mentor);

      // Show mentor dialog with suggestion (expects class key like "Jedi")
      const result = await MentorSuggestionDialog.show(this.currentMentorClass, topSuggestion, 'talent_selection');

      if (result && result.applied) {
        // Auto-select the talent
        await this._selectTalent(topSuggestion.name);

        // Show mentor context if available
        if (mentorContext) {
          ui.notifications.info(mentorContext);
        } else {
          ui.notifications.info(`${this.mentor.name} suggests: ${topSuggestion.name}`);
        }
      }
    } catch (err) {
      console.error('Error getting talent suggestion:', err);
      ui.notifications.error('Error getting mentor suggestion. Check console.');
    }
  }

  /**
   * Ask mentor for Force power suggestion
   */
  async _onAskMentorForcePowerSuggestion(event) {
    event.preventDefault();

    try {
      const { getAvailableForcePowers } = await import('../levelup/levelup-force-powers.js');
      const { ForceOptionSuggestionEngine } = await import('../../engine/ForceOptionSuggestionEngine.js');

      const availablePowers = await getAvailableForcePowers(this.actor, {});

      if (!availablePowers || availablePowers.length === 0) {
        ui.notifications.warn('No available Force powers to suggest.');
        return;
      }

      // Filter out already-selected powers
      const unselectedPowers = availablePowers.filter(p => p.isQualified &&
        !this.actor.items.some(i => i.type === 'forcepower' && i.name === p.name)
      );

      if (unselectedPowers.length === 0) {
        ui.notifications.warn("You've already learned all available Force powers!");
        return;
      }

      // Get suggestions using the Force power suggestion engine
      const pendingData = this._buildPendingData();
      const suggestions = await SuggestionService.getSuggestions(this.actor, 'levelup', {
        domain: 'forcepowers',
        available: unselectedPowers,
        pendingData,
        engineOptions: { buildIntent: {} },
        persist: true
      });

      // Get the top-tier suggestion
      const topSuggestion = suggestions.find(s => s.suggestion?.tier >= 4) || suggestions[0];

      if (!topSuggestion) {
        ui.notifications.warn('No Force power suggestions available at this time.');
        return;
      }

      // Show mentor suggestion dialog
      await MentorSuggestionDialog.show(this.currentMentorClass, topSuggestion, 'force_power_selection');

      ui.notifications.info(`${this.mentor.name} suggests: ${topSuggestion.name}`);
    } catch (err) {
      console.error('Error getting Force power suggestion:', err);
      ui.notifications.error('Error getting mentor suggestion. Check console.');
    }
  }

  /**
   * Ask mentor for attribute increase suggestion
   */
  async _onAskMentorAttributeSuggestion(event) {
    event.preventDefault();

    try {
      // Get pending data and compute BuildIntent for context
      const pendingData = this._buildPendingData();
      const buildIntent = await game.swse.suggestions.buildIntent(this.actor, pendingData);

      // Get attribute suggestions
      const suggestions = await SuggestionService.getSuggestions(this.actor, 'levelup', {
        domain: 'attributes',
        pendingData,
        engineOptions: { buildIntent },
        persist: true
      });

      if (!suggestions || suggestions.length === 0) {
        ui.notifications.warn('No attribute suggestions available at this time.');
        return;
      }

      // Find the best suggestion (tier 5 first, then 4, etc.)
      const topSuggestion = suggestions.find(s => s.suggestion?.tier >= 3) || suggestions[0];

      if (!topSuggestion) {
        ui.notifications.warn('No suitable attribute suggestions found.');
        return;
      }

      // Create suggestion object compatible with MentorSuggestionDialog
      const suggestionObj = {
        _id: topSuggestion.abbrev,
        name: topSuggestion.ability,
        tier: topSuggestion.suggestion?.tier || 0
      };

      // Show mentor dialog with suggestion
      const result = await MentorSuggestionDialog.show(
        this.currentMentorClass,
        suggestionObj,
        'attribute_increase'
      );

      if (result && result.applied) {
        // Auto-apply the attribute increase
        await this._onAbilityIncrease({
          preventDefault: () => {},
          currentTarget: { dataset: { ability: topSuggestion.abbrev } }
        });

        // Show reason for suggestion
        if (topSuggestion.suggestion?.reason) {
          ui.notifications.info(`${this.mentor.name} suggests: ${topSuggestion.ability} (${topSuggestion.suggestion.reason})`);
        } else {
          ui.notifications.info(`${this.mentor.name} suggests: ${topSuggestion.ability}`);
        }
      }
    } catch (err) {
      console.error('Error getting attribute suggestion:', err);
      ui.notifications.error('Error getting mentor suggestion. Check console.');
    }
  }

  /**
   * Build pending data object from current selections
   */
  _buildPendingData() {
    // Extract trained skills from actor
    const trainedSkills = Object.entries(this.actor.system.skills || {})
      .filter(([key, skill]) => skill?.trained)
      .map(([key]) => key);

    // Get granted feats (houserules + level 1 class features)
    const grantedFeats = PrerequisiteChecker.getAllGrantedFeats(this.actor, this.selectedClass);

    return {
      selectedClass: this.selectedClass,
      selectedFeats: this.selectedFeats || [],
      selectedTalents: this.selectedTalents || [],
      selectedSkills: this.selectedSkills || [],
      abilityIncreases: this.abilityIncreases || {},
      trainedSkills: trainedSkills,
      grantedFeats: grantedFeats
    };
  }

  // ========================================
  // FEAT LOADING AND SELECTION
  // ========================================

  async _loadFeats() {
    const pendingData = {
      selectedFeats: this.selectedFeats,
      selectedClass: this.selectedClass,
      abilityIncreases: this.abilityIncreases,
      selectedSkills: this.selectedSkills,
      newLevel: data.newLevel,
      plannedHeroicLevel: data.newLevel,
      epicAdvisory: data.epicAdvisory
    };

    this.featData = await loadFeats(this.actor, this.selectedClass, pendingData);
  }

  async _loadForcePowers() {
    this.forcePowerData = await loadForcePowers();
  }

  async _onSelectForcePower(event) {
    event.preventDefault();
    const powerId = event.currentTarget.dataset.powerId;
    this.selectedForcePowers = selectForcePower(powerId, this.forcePowerData, this.selectedForcePowers);
    this._debounceRender();
  }

  async _onSelectBonusFeat(event) {
    event.preventDefault();
    const featId = event.currentTarget.dataset.featId;

    const featData = this.featData?.feats || [];
    const feat = selectBonusFeat(featId, featData, this.selectedFeats);
    if (!feat) {return;}

    // Check for duplicates - character already has this feat (allow for repeatable feats)
    const alreadyHas = this.actor.items.some(i =>
      i.type === 'feat' && (i.name === feat.name || i._id === feat._id || i._id === featId)
    );

    // Check if already selected in this level-up session
    const alreadySelected = this.selectedFeats.some(f =>
      f.name === feat.name || f._id === feat._id || f._id === featId
    );

    // List of repeatable feats
    const repeatableFeats = [
      'Extra Second Wind', 'Extra Rage', 'Skill Training', 'Linguist',
      'Exotic Weapon Proficiency', 'Weapon Proficiency', 'Weapon Focus',
      'Double Attack', 'Triple Attack', 'Triple Crit',
      'Force Training', 'Force Regimen Mastery'
    ];
    const isRepeatable = repeatableFeats.some(rf => feat.name.includes(rf) || rf.includes(feat.name));

    if (alreadyHas && !isRepeatable) {
      ui.notifications.warn(`You already have the feat "${feat.name}"!`);
      return;
    }

    if (alreadySelected && !isRepeatable) {
      ui.notifications.warn(`You've already selected "${feat.name}" this level!`);
      return;
    }

    // Check if this feat requires a dialog for selection
    if (feat.name.includes('Force Training')) {
      await this._handleForceTrainingFeat(feat);
    } else if (feat.name === 'Skill Training') {
      // Only show dialog if feat is exactly "Skill Training" (not already specified)
      await this._handleSkillTrainingFeat(feat);
    } else if ((feat.name === 'Weapon Proficiency' || feat.name === 'Exotic Weapon Proficiency' || feat.name === 'Weapon Focus') ||
               (feat.name.includes('Weapon Proficiency') && !feat.name.includes('(')) ||
               (feat.name.includes('Weapon Focus') && !feat.name.includes('(')) ||
               (feat.name.includes('Exotic Weapon Proficiency') && !feat.name.includes('('))) {
      // Only show dialog if weapon type is not already specified in parentheses
      await this._handleWeaponChoiceFeat(feat);
    } else {
      // Standard feat selection (including feats with specific weapons already chosen)
      this.selectedFeats.push(feat);
      ui.notifications.info(`Selected feat: ${feat.name}`);
    }

    await this._debounceRender();
  }

  // ========================================
  // FEAT SELECTION DIALOGS
  // ========================================

  async _handleForceTrainingFeat(feat) {
    // Force Training opens the force power selection interface
    // For now, just add the feat - the force power selection happens separately
    this.selectedFeats.push(feat);
    ui.notifications.info(`Selected feat: ${feat.name}. You will select Force powers separately.`);
  }

  async _handleSkillTrainingFeat(feat) {
    // Get all skills
    const skills = [
      { key: 'acrobatics', name: 'Acrobatics' },
      { key: 'climb', name: 'Climb' },
      { key: 'deception', name: 'Deception' },
      { key: 'endurance', name: 'Endurance' },
      { key: 'gatherInformation', name: 'Gather Information' },
      { key: 'initiative', name: 'Initiative' },
      { key: 'jump', name: 'Jump' },
      { key: 'mechanics', name: 'Mechanics' },
      { key: 'perception', name: 'Perception' },
      { key: 'persuasion', name: 'Persuasion' },
      { key: 'pilot', name: 'Pilot' },
      { key: 'ride', name: 'Ride' },
      { key: 'stealth', name: 'Stealth' },
      { key: 'survival', name: 'Survival' },
      { key: 'swim', name: 'Swim' },
      { key: 'treatInjury', name: 'Treat Injury' },
      { key: 'useComputer', name: 'Use Computer' },
      { key: 'useTheForce', name: 'Use the Force' }
    ];

    // Get currently trained skills to show as already selected
    const trainedSkills = Object.keys(this.actor.system.skills || {})
      .filter(key => this.actor.system.skills[key]?.trained);

    // Create options HTML
    const skillOptions = skills.map(skill => {
      const isTrained = trainedSkills.includes(skill.key);
      return `<option value="${skill.key}" ${isTrained ? 'disabled' : ''}>${skill.name}${isTrained ? ' ✓ (already trained)' : ''}</option>`;
    }).join('');

    return new Promise((resolve) => {
      const dialog = new SWSEDialogV2({
        title: `${feat.name} - Select Skill`,
        content: `
          <div class="form-group">
            <label>Choose a skill to gain training in:</label>
            <select id="skill-training-selection" style="width: 100%; padding: 5px;">
              ${skillOptions}
            </select>
            <p class="hint-text" style="margin-top: 10px;">
              <i class="fa-solid fa-circle-info"></i>
              You gain training in this skill, making it a class skill and allowing you to use it untrained.
            </p>
          </div>
        `,
        buttons: {
          select: {
            icon: '<i class="fa-solid fa-check"></i>',
            label: 'Select',
            callback: (html) => {
              const root = html instanceof HTMLElement ? html : html?.[0];
    const selectedSkill = root?.querySelector?.('#skill-training-selection')?.value;
              const skillName = skills.find(s => s.key === selectedSkill)?.name || selectedSkill;

              // Create a modified feat with the skill choice noted
              const modifiedFeat = foundry.utils.deepClone(feat);
              modifiedFeat.system.benefit = `${feat.system.benefit}\n\n<strong>Selected Skill:</strong> ${skillName}`;
              modifiedFeat.name = `${feat.name} (${skillName})`;

              this.selectedFeats.push(modifiedFeat);
              ui.notifications.info(`Selected ${feat.name} for ${skillName}`);
              dialog.close();
              resolve(true);
            }
          },
          cancel: {
            icon: '<i class="fa-solid fa-times"></i>',
            label: 'Cancel',
            callback: () => {
              ui.notifications.warn('Skill Training feat cancelled.');
              dialog.close();
              resolve(false);
            }
          }
        },
        default: 'select'
      }, { width: 400 });
      dialog.render(true);
    });
  }

  async _handleWeaponChoiceFeat(feat) {
    // Define weapon groups and options
    let weaponOptions = [];
    let title = '';
    let description = '';

    if (feat.name.includes('Weapon Proficiency')) {
      title = `${feat.name} - Select Weapon Group`;
      description = 'Choose a weapon group to gain proficiency with:';
      weaponOptions = [
        { value: 'simple', label: 'Simple Weapons' },
        { value: 'pistols', label: 'Pistols' },
        { value: 'rifles', label: 'Rifles' },
        { value: 'heavy', label: 'Heavy Weapons' },
        { value: 'advanced_melee', label: 'Advanced Melee Weapons' }
      ];
    } else if (feat.name.includes('Exotic Weapon Proficiency')) {
      title = `${feat.name} - Select Exotic Weapon`;
      description = 'Choose an exotic weapon to gain proficiency with:';
      weaponOptions = [
        { value: 'lightwhip', label: 'Lightwhip' },
        { value: 'net', label: 'Net' },
        { value: 'bolas', label: 'Bolas' },
        { value: 'shockwhip', label: 'Shockwhip' },
        { value: 'lightsaber', label: 'Lightsaber' },
        { value: 'double_lightsaber', label: 'Double-Bladed Lightsaber' }
      ];
    } else if (feat.name.includes('Weapon Focus')) {
      title = `${feat.name} - Select Weapon Group`;
      description = 'Choose a weapon group or exotic weapon to focus on:';
      weaponOptions = [
        { value: 'pistols', label: 'Pistols' },
        { value: 'rifles', label: 'Rifles' },
        { value: 'heavy', label: 'Heavy Weapons' },
        { value: 'simple', label: 'Simple Weapons' },
        { value: 'advanced_melee', label: 'Advanced Melee Weapons' },
        { value: 'lightsabers', label: 'Lightsabers' }
      ];
    }

    const optionsHTML = weaponOptions.map(opt =>
      `<option value="${opt.value}">${opt.label}</option>`
    ).join('');

    return new Promise((resolve) => {
      const dialog = new SWSEDialogV2({
        title: title,
        content: `
          <div class="form-group">
            <label>${description}</label>
            <select id="weapon-choice-selection" style="width: 100%; padding: 5px;">
              ${optionsHTML}
            </select>
            <p class="hint-text" style="margin-top: 10px;">
              <i class="fa-solid fa-circle-info"></i>
              ${feat.system.benefit || ''}
            </p>
          </div>
        `,
        buttons: {
          select: {
            icon: '<i class="fa-solid fa-check"></i>',
            label: 'Select',
            callback: (html) => {
              const root = html instanceof HTMLElement ? html : html?.[0];
    const selectedWeapon = root?.querySelector?.('#weapon-choice-selection')?.value;
              const weaponLabel = weaponOptions.find(w => w.value === selectedWeapon)?.label || selectedWeapon;

              // Create a modified feat with the weapon choice noted
              const modifiedFeat = foundry.utils.deepClone(feat);
              modifiedFeat.system.benefit = `${feat.system.benefit}\n\n<strong>Selected Weapon:</strong> ${weaponLabel}`;
              modifiedFeat.name = `${feat.name} (${weaponLabel})`;

              this.selectedFeats.push(modifiedFeat);
              ui.notifications.info(`Selected ${feat.name} for ${weaponLabel}`);
              dialog.close();
              resolve(true);
            }
          },
          cancel: {
            icon: '<i class="fa-solid fa-times"></i>',
            label: 'Cancel',
            callback: () => {
              ui.notifications.warn('Feat selection cancelled.');
              dialog.close();
              resolve(false);
            }
          }
        },
        default: 'select'
      }, { width: 400 });
      dialog.render(true);
    });
  }

  // ========================================
  // FEAT FILTERING AND SEARCH
  // ========================================

  _onToggleFeatCategory(event) {
    const root = this.element;
    const header = event.currentTarget;
    const categoryElement = header?.closest?.('.feat-category');
    if (!categoryElement) {return;}

    categoryElement.classList.toggle('expanded');
    const feats = qs(categoryElement, '.category-feats');
    if (feats) {setVisible(feats, categoryElement.classList.contains('expanded'));}
  }

  _onFeatSearch(event) {
    const root = this.element;
    const input = event.currentTarget;
    this._featSearchTerm = (input?.value ?? '').toLowerCase().trim();

    const clearBtn = qs(root, '.clear-search-btn');
    setVisible(clearBtn, this._featSearchTerm.length > 0);

    this._applyFeatFilters();
  }

  _onClearSearch() {
    const root = this.element;
    const input = qs(root, '.feat-search-input');
    if (input) {input.value = '';}
    this._featSearchTerm = '';
    const clearBtn = qs(root, '.clear-search-btn');
    setVisible(clearBtn, false);
    this._applyFeatFilters();
  }

  _onClearAllFilters() {
    const root = this.element;

    const input = qs(root, '.feat-search-input');
    if (input) {input.value = '';}
    this._featSearchTerm = '';
    setVisible(qs(root, '.clear-search-btn'), false);

    this.activeTags = [];
    this._updateActiveTagsDisplay();

    const toggle = qs(root, '.show-unavailable-toggle');
    if (toggle) {toggle.checked = false;}

    this._applyFeatFilters();
  }

  _onToggleShowUnavailable() {
    this._applyFeatFilters();
  }

  _onClickFeatTag(event) {
    const tag = event.currentTarget?.dataset?.tag;
    if (!tag) {return;}

    if (!Array.isArray(this.activeTags)) {this.activeTags = [];}
    if (!this.activeTags.includes(tag)) {this.activeTags.push(tag);}

    this._updateActiveTagsDisplay();
    this._applyFeatFilters();
  }

  _applyFeatFilters() {
    const root = this.element;
    const term = (this._featSearchTerm ?? '').toLowerCase().trim();
    const filtersActive = !!term || (Array.isArray(this.activeTags) && this.activeTags.length > 0);

    const showUnavailable = !!qs(root, '.show-unavailable-toggle')?.checked;

    qsa(root, '.feat-card').forEach(card => {
      const name = (card.dataset?.featName ?? '').toLowerCase();
      const tags = (card.dataset?.featTags ?? '').toLowerCase();

      const matchesText = !term || name.includes(term) || tags.includes(term);
      const matchesUnavailable = showUnavailable || !card.classList.contains('unavailable');

      let matchesTags = true;
      if (Array.isArray(this.activeTags) && this.activeTags.length > 0) {
        const featTags = (card.dataset?.featTags ?? '').split(',').map(t => t.trim());
        matchesTags = this.activeTags.every(t => featTags.includes(t));
      }

      setVisible(card, matchesText && matchesUnavailable && matchesTags);
    });

    qsa(root, '.feat-category').forEach(category => {
      const featsContainer = qs(category, '.category-feats');
      const visibleFeats = qsa(category, '.feat-card').filter(isVisible).length;

      const badge = qs(category, '.count-badge');
      if (badge) {badge.textContent = String(visibleFeats);}

      category.classList.toggle('empty-category', visibleFeats === 0);

      if (filtersActive) {category.classList.toggle('expanded', visibleFeats > 0);}

      if (featsContainer) {
        const show = category.classList.contains('expanded') && visibleFeats > 0;
        setVisible(featsContainer, show);
      }
    });

    const totalVisible = qsa(root, '.feat-card').filter(isVisible).length;
    const totalBadge = qs(root, '.total-count-badge');
    if (totalBadge) {totalBadge.textContent = String(totalVisible);}
  }

  _updateActiveTagsDisplay() {
    const root = this.element;
    const container = qs(root, '.active-tags-container');
    if (!container) {return;}

    container.innerHTML = '';

    const active = Array.isArray(this.activeTags) ? this.activeTags : [];
    active.forEach(tag => {
      const badge = document.createElement('span');
      badge.className = 'active-tag-badge';
      badge.dataset.tag = tag;
      badge.innerHTML = `${tag} <i class="fa-solid fa-times remove-tag"></i>`;
      container.appendChild(badge);

      badge.addEventListener('click', (ev) => {
        if (!ev.target?.classList?.contains('remove-tag')) {return;}
        this.activeTags = (this.activeTags || []).filter(t => t !== tag);
        this._updateActiveTagsDisplay();
        this._applyFeatFilters();
      });
    });

    setVisible(qs(root, '.active-filters'), active.length > 0);
  }

  _filterByActiveTags() {
    this._applyFeatFilters();
  }

  _updateCategoryCounts() {
    this._applyFeatFilters();
  }


  _onShowPrestigeClasses(event) {
    event.preventDefault();
    this.currentStep = 'prestige';
    this._debounceRender();
  }

  /**
   * Navigate back to base class selection screen
   */
  _onBackToBaseClasses(event) {
    event.preventDefault();
    this.currentStep = 'class';
    this._debounceRender();
  }

  // ========================================
  // MULTICLASS BONUS
  // ========================================

  async _onSelectMulticlassFeat(event) {
    event.preventDefault();
    const featId = event.currentTarget.dataset.featId;

    const feat = await selectMulticlassFeat(featId);
    if (!feat) {return;}

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
    await this._debounceRender();
  }

  async _onSelectMulticlassSkill(event) {
    event.preventDefault();
    const skillKey = event.currentTarget.dataset.skill;
    const skillName = event.currentTarget.dataset.skillName || skillKey;

    const skill = selectMulticlassSkill(skillKey, skillName);
    this.selectedSkills = [skill];
    ui.notifications.info(`Selected trained skill: ${skillName}`);
    await this._debounceRender();
  }

  // ========================================
  // ABILITY SCORE INCREASES
  // ========================================

  async _onAbilityIncrease(event) {
    event.preventDefault();
    const ability = event.currentTarget.dataset.ability;
    const abilityIncreaseMethod = game.settings.get('foundryvtt-swse', 'abilityIncreaseMethod');

    if (!this.abilityIncreases[ability]) {
      this.abilityIncreases[ability] = 0;
    }

    // Calculate total points allocated
    const totalAllocated = Object.values(this.abilityIncreases).reduce((sum, val) => sum + val, 0);

    if (abilityIncreaseMethod === 'flexible') {
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
        ui.notifications.warn('Standard method: You must allocate to 2 different attributes!');
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

    await this._debounceRender();
  }

  // ========================================
  // TALENT TREE SELECTION
  // ========================================

  async _onSelectTalentTree(event) {
    event.preventDefault();

    // Determine which talent type we're selecting (heroic or class)
    const selectionType = event.currentTarget.dataset.talentType || 'heroic';
    this.currentTalentSelectionType = selectionType;

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
    // Include actor's existing talents in pendingData for prerequisite checking
    const existingTalents = this.actor.items
      .filter(i => i.type === 'talent')
      .map(t => ({ name: t.name, _id: t.id }));

    // Collect pending talents from both heroic and class selections
    const pendingTalents = [];
    if (this.selectedTalents.heroic) {
      pendingTalents.push(this.selectedTalents.heroic);
    }
    if (this.selectedTalents.class) {
      pendingTalents.push(this.selectedTalents.class);
    }

    const pendingData = {
      selectedFeats: this.selectedFeats,
      selectedClass: this.selectedClass,
      abilityIncreases: this.abilityIncreases,
      selectedSkills: this.selectedSkills,
      selectedTalents: [...existingTalents, ...pendingTalents]
    };

    const talent = selectTalent(talentName, this.talentData, this.actor, pendingData);
    if (talent) {
      // Check if this is the combined Block & Deflect talent
      if (HouseRuleTalentCombination.isBlockDeflectCombined(talent)) {
        // Store the combined talent but with a flag indicating it should grant both
        talent._data = {
          isBlockDeflectCombined: true,
          actualTalentsToGrant: HouseRuleTalentCombination.getActualTalentsToGrant(talentName)
        };
      }

      // Store in the appropriate talent slot based on current selection type
      const selectionType = this.currentTalentSelectionType || 'heroic';
      if (selectionType === 'class') {
        this.selectedTalents.class = talent;
        ui.notifications.info(`Selected class talent: ${talentName}`);
      } else {
        this.selectedTalents.heroic = talent;
        ui.notifications.info(`Selected heroic talent: ${talentName}`);
      }

      if (talent._data?.isBlockDeflectCombined) {
        ui.notifications.info(`Selected combined talent: Block & Deflect (will grant both Block and Deflect)`);
      }
    }
  }

  // ========================================
  // NAVIGATION
  // ========================================

  async _onNextStep() {
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
          ui.notifications.warn('You must allocate all 2 ability points before continuing! (Or enable Free Build mode to skip)');
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
      case 'feat': {
        // Check if they selected a feat (unless in Free Build mode)
        if (!this.freeBuild && this.selectedFeats.length === 0) {
          ui.notifications.warn('You must select a feat before continuing! (Or enable Free Build mode to skip)');
          return;
        }
        // Check if Force Powers step applies
        const getsFP = getsForcePowers(this.actor, this.selectedFeats);
        if (getsFP) {
          this.currentStep = 'force-powers';
        } else if (getsTal) {
          this.currentStep = 'talent';
        } else {
          this.currentStep = 'summary';
        }
        break;
      }
      case 'force-powers': {
        // Check if they selected required force powers (unless in Free Build mode)
        const fpCount = await countForcePowersGained(this.actor, this.selectedFeats);
        if (!this.freeBuild && this.selectedForcePowers.length < fpCount) {
          ui.notifications.warn(`You must select ${fpCount} force power(s) before continuing! (Or enable Free Build mode to skip)`);
          return;
        }
        if (getsTal) {
          this.currentStep = 'talent';
        } else {
          this.currentStep = 'summary';
        }
        break;
      }
      case 'talent': {
        // Check if all required talents are selected (dual talent progression)
        const talentState = getTalentSelectionState(this.selectedClass, this.actor);
        const heroicDone = !talentState.needsHeroicTalent || this.selectedTalents.heroic;
        const classDone = !talentState.needsClassTalent || this.selectedTalents.class;

        if (!this.freeBuild && (!heroicDone || !classDone)) {
          const missing = [];
          if (!heroicDone) {missing.push('Heroic Talent');}
          if (!classDone) {missing.push('Class Talent');}
          ui.notifications.warn(`You must select the following before continuing: ${missing.join(', ')}. (Or enable Free Build mode to skip)`);
          return;
        }
        this.currentStep = 'summary';
        break;
      }
    }

    this._debounceRender();
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
      case 'force-powers':
        this.currentStep = 'feat';
        break;
      case 'talent':
        const getsFP = getsForcePowers(this.actor, this.selectedFeats);
        if (getsFP) {
          this.currentStep = 'force-powers';
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
      case 'summary':
        if (getsTal) {
          this.currentStep = 'talent';
        } else if (getsForcePowers(this.actor, this.selectedFeats)) {
          this.currentStep = 'force-powers';
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

    this._debounceRender();
  }

  /**
   * Skip current step - forces navigation to next step without validation
   * Shows confirmation dialog first
   */
  async _onSkipStep(event) {
    event.preventDefault();

    const confirmed = await SWSEDialogV2.confirm({
      title: 'Skip This Step?',
      content: `
        <div class="skip-warning">
          <p><i class="fa-solid fa-exclamation-triangle"></i> <strong>Warning:</strong></p>
          <p>You are about to skip this step without completing it.</p>
          <p>You will be responsible for adding any missing selections later.</p>
          <p>Continue?</p>
        </div>
      `
    });

    if (!confirmed) {return;}

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
      SWSEDialogV2.confirm({
        title: 'Enable Free Build Mode?',
        content: `
          <div class="free-build-warning">
            <p><i class="fa-solid fa-unlock-alt"></i> <strong>Free Build Mode</strong></p>
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
          this._debounceRender();
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
      this._debounceRender();
    }
  }

  // ========================================
  // COMPLETE LEVEL UP
  // ========================================

  async _onCompleteLevelUp(event) {
    event.preventDefault();

    // Validation before attempting level up
    if (!this.selectedClass) {
      ui.notifications.error('You must select a class before completing level up.');
      return;
    }

    try {
      const newLevel = this.actor.system.level + 1;

      // If this is level 1, save the starting class for mentor system
      if (this.actor.system.level === 1) {
        await setLevel1Class(this.actor, this.selectedClass.name);
      }

      // ========================================
      // STEP 1: Sync selections to progression engine
      // ========================================
      swseLogger.log('SWSE LevelUp | Syncing selections to progression engine');

      // Confirm class selection through the progression engine
      await this.progressionEngine.doAction('confirmClass', {
        classId: this.selectedClass.name,
        skipPrerequisites: this.freeBuild
      });

      // Add ability score increases if any (at levels 4, 8, 12, 16, 20)
      if (Object.keys(this.abilityIncreases).length > 0) {
        const abilityUpdates = {};
        for (const [ability, increase] of Object.entries(this.abilityIncreases)) {
          if (increase > 0) {
            abilityUpdates[ability] = increase;
          }
        }
        if (Object.keys(abilityUpdates).length > 0) {
          await this.progressionEngine.doAction('confirmAbilities', {
            increases: abilityUpdates
          });
        }
      }

      // Add feats to progression if any
      if (this.selectedFeats.length > 0) {
        const featNames = this.selectedFeats.map(f => f.name);
        await this.progressionEngine.doAction('confirmFeats', {
          featIds: featNames
        });
      }

      // Add talents to progression (both heroic and class talents if present)
      const talentsToGrant = [];

      if (this.selectedTalents.heroic) {
        const heroicTalent = this.selectedTalents.heroic;
        const isBlockDeflect = heroicTalent._data?.isBlockDeflectCombined;
        const heroicNames = isBlockDeflect
          ? heroicTalent._data.actualTalentsToGrant
          : [heroicTalent.name];
        talentsToGrant.push(...heroicNames);
      }

      if (this.selectedTalents.class) {
        const classTalent = this.selectedTalents.class;
        const isBlockDeflect = classTalent._data?.isBlockDeflectCombined;
        const classNames = isBlockDeflect
          ? classTalent._data.actualTalentsToGrant
          : [classTalent.name];
        talentsToGrant.push(...classNames);
      }

      if (talentsToGrant.length > 0) {
        await this.progressionEngine.doAction('confirmTalents', {
          talentIds: talentsToGrant
        });
      }

      // Add trained skills to progression if any (from multiclass bonus)
      if (this.selectedSkills.length > 0) {
        const skillNames = this.selectedSkills.map(s =>
          typeof s === 'string' ? s : (s.key || s.name)
        );
        // Update the progression data directly for multiclass skills
        // since these are bonus trainings, not the normal skill selection
        const currentSkills = this.actor.system.progression?.trainedSkills || [];
        const allSkills = [...new Set([...currentSkills, ...skillNames])];
        await this.progressionEngine.doAction('confirmSkills', {
          skills: allSkills
        });
      }

      // ========================================
      // STEP 2: Finalize through progression engine
      // ========================================
      swseLogger.log('SWSE LevelUp | Finalizing through progression engine');

      // The progression engine handles:
      // - Updating level, HP, BAB, defenses
      // - Creating class/feat/talent items
      // - Triggering force power grants
      // - Updating force sensitivity
      // - Emitting completion hooks (language module, etc.)
      const success = await this.progressionEngine.finalize();

      if (!success) {
        throw new Error('Progression engine finalization failed');
      }

      // ========================================
      // STEP 2b: Mentor Memory - Decay & Update
      // ========================================
      // Decay mentor commitments on levelup
      // This ensures soft commitments fade unless reinforced
      await decayAllMentorCommitments(this.actor, 0.15);
      // Update all mentor memories with current actor state
      await updateAllMentorMemories(this.actor);

      swseLogger.log('SWSE LevelUp | Mentor memory: Decayed commitments and updated role inference');

      // ========================================
      // STEP 3: Additional level-up specific handling
      // ========================================

      // Check for milestone feat at levels 3, 6, 9, 12, 15, 18
      const getMilestoneFt = getsMilestoneFeat(newLevel);
      if (getMilestoneFt) {
        ui.notifications.info(`Level ${newLevel}! You gain a bonus general feat.`);
        swseLogger.log(`SWSE LevelUp | Level ${newLevel} milestone - bonus general feat granted`);
      }

      // Handle CON modifier retroactive HP
      // Note: This is level-up specific since chargen starts fresh
      // Droids don't have Constitution, skip HP gain for droids
      const isDroid = this.actor.system.isDroid || false;
      if (isDroid && this.abilityIncreases.con && this.abilityIncreases.con > 0) {
        swseLogger.log('SWSE LevelUp | CON modifier increase: Skipped for droid (no CON)');
      } else if (!isDroid && this.abilityIncreases.con && this.abilityIncreases.con > 0) {
        // Check if the increase pushed us to a new modifier tier
        const conMod = this.actor.system.attributes?.con?.mod || 0;
        const oldConBase = (this.actor.system.attributes?.con?.base || 10) - this.abilityIncreases.con;
        const oldConMod = Math.floor((oldConBase - 10) / 2);
        if (conMod > oldConMod) {
          const modIncrease = conMod - oldConMod;
          const retroactiveHPGain = newLevel * modIncrease;
          // Apply retroactive HP
          const currentHP = this.actor.system.hp.max || 0;
          await this.actor.update({
            'system.hp.max': currentHP + retroactiveHPGain,
            'system.hp.value': (this.actor.system.hp.value || 0) + retroactiveHPGain
          });
          swseLogger.log(`SWSE LevelUp | CON modifier increased - granting ${retroactiveHPGain} retroactive HP`);
          ui.notifications.info(`Constitution increased! You gain ${retroactiveHPGain} retroactive HP!`);
        }
      }

      // Handle INT modifier bonus skill notification
      if (this.abilityIncreases.int && this.abilityIncreases.int > 0) {
        const oldIntBase = (this.actor.system.attributes?.int?.base || 10) - this.abilityIncreases.int;
        const oldIntMod = Math.floor((oldIntBase - 10) / 2);
        const newIntMod = this.actor.system.attributes?.int?.mod || 0;
        if (newIntMod > oldIntMod) {
          ui.notifications.info(`Intelligence increased! You may train 1 additional skill.`);
        }
      }

      // ========================================
      // STEP 4: Create chat message
      // ========================================

      // Build ability increases text
      let abilityText = '';
      if (Object.keys(this.abilityIncreases).length > 0) {
        const increases = Object.entries(this.abilityIncreases)
          .filter(([_, val]) => val > 0)
          .map(([ability, val]) => `${ability.toUpperCase()} +${val}`)
          .join(', ');
        abilityText = `<p><strong>Ability Increases:</strong> ${increases}</p>`;

        if (retroactiveHPGain > 0) {
          abilityText += `<p><em>CON modifier increased! Gained ${retroactiveHPGain} retroactive HP.</em></p>`;
        }
      }

      // Build HP gain text
      let hpGainText = `${this.hpGain}`;
      if (retroactiveHPGain > 0) {
        hpGainText += ` (+ ${retroactiveHPGain} from CON increase)`;
      }

      const newHPMax = this.actor.system.hp.max;

      // Create chat message with mentor narration
      const chatContent = `
        <div class="swse level-up-message">
          <h3><i class="fa-solid fa-level-up-alt"></i> Level Up!</h3>
          <div class="mentor-narration" style="background: rgba(0,0,0,0.3); padding: 0.5rem; border-left: 3px solid #00d9ff; margin: 0.5rem 0; font-style: italic;">
            <strong>${this.mentor.name}, ${this.mentor.title}:</strong><br>
            "${this.mentorGreeting}"
          </div>
          <p><strong>${this.actor.name}</strong> advanced to level <strong>${newLevel}</strong>!</p>
          <p><strong>Class:</strong> ${this.selectedClass.name}</p>
          <p><strong>HP Gained:</strong> ${hpGainText}</p>
          <p><strong>New HP Total:</strong> ${newHPMax}</p>
          ${abilityText}
          ${this.selectedTalents.heroic ? `<p><strong>Heroic Talent:</strong> ${this.selectedTalents.heroic.name}</p>` : ''}
          ${this.selectedTalents.class ? `<p><strong>Class Talent:</strong> ${this.selectedTalents.class.name}</p>` : ''}
          ${this.selectedFeats.length > 0 ? `<p><strong>Feat:</strong> ${this.selectedFeats.map(f => f.name).join(', ')}</p>` : ''}
          ${getMilestoneFt ? `<p><strong>Milestone Feat:</strong> Gain 1 bonus general feat!</p>` : ''}
        </div>
      `;

      await createChatMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content: chatContent,
        style: CONST.CHAT_MESSAGE_STYLES.OTHER
      });

      ui.notifications.success(`${this.actor.name} leveled up to level ${newLevel}!`);

      // Close dialog and re-render actor sheet to show changes
      this.close();
      this.actor.sheet.render(true);

    } catch (err) {
      swseLogger.error('SWSE LevelUp | Error completing level up:', err);

      // Provide specific error message based on error type
      let errorMessage = 'Failed to complete level up';
      if (err.message) {
        // Extract meaningful error messages
        if (err.message.includes('talent')) {
          errorMessage = `Talent Error: ${err.message}`;
        } else if (err.message.includes('feat')) {
          errorMessage = `Feat Error: ${err.message}`;
        } else if (err.message.includes('class')) {
          errorMessage = `Class Error: ${err.message}`;
        } else if (err.message.includes('skill')) {
          errorMessage = `Skill Error: ${err.message}`;
        } else if (err.message.includes('ability')) {
          errorMessage = `Ability Score Error: ${err.message}`;
        } else if (err.message.includes('prerequisite') || err.message.includes('requires')) {
          errorMessage = `Prerequisite Error: ${err.message}`;
        } else {
          errorMessage = `${errorMessage}: ${err.message}`;
        }
      }

      ui.notifications.error(errorMessage, { permanent: true });
      ui.notifications.warn('Your character may be in an inconsistent state. Please check your character sheet and contact the GM if needed.');

      // Re-render to show current state
      this._debounceRender();
    }
  }

  async _updateObject(event, formData) {
    // Not used - level up is handled by _onCompleteLevelUp
  }

  /**
   * PHASE B: Clean up event listeners on close
   */
  async close(options) {
    // Remove all tracked event listeners
    this._eventListeners.forEach(({ el, event, handler }) => {
      el.removeEventListener(event, handler);
    });
    this._eventListeners = [];

    // Clear render timeout if pending
    if (this._renderTimeout) {
      clearTimeout(this._renderTimeout);
      this._renderTimeout = null;
    }

    return super.close(options);
  }
}
