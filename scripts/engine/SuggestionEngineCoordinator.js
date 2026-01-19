/**
 * SWSE Suggestion Engine Coordinator
 *
 * Provides a unified, centralized interface for all suggestion engines:
 * - SuggestionEngine (feats/talents)
 * - ClassSuggestionEngine (classes)
 * - ForceOptionSuggestionEngine (Force powers, secrets, techniques)
 * - Level1SkillSuggestionEngine (skill training at character creation)
 * - AttributeIncreaseSuggestionEngine (ability score increases at levels 4, 8, 12, 16, 20)
 * - BuildIntent (build direction analysis)
 * - ProgressionAdvisor (attribute-weighted suggestions)
 * - CommunityMetaSynergies (meta synergy detection)
 *
 * This coordinator handles:
 * - Engine initialization
 * - BuildIntent computation and caching
 * - Attribute-aware weighting across all suggestions
 * - API exposure through game.swse
 * - Integration with progression engine
 * - State management across level-ups
 */

import { SWSELogger } from '../utils/logger.js';
import { SuggestionEngine } from './SuggestionEngine.js';
import { ClassSuggestionEngine } from './ClassSuggestionEngine.js';
import { BackgroundSuggestionEngine } from './BackgroundSuggestionEngine.js';
import { ForceOptionSuggestionEngine } from './ForceOptionSuggestionEngine.js';
import { Level1SkillSuggestionEngine } from './Level1SkillSuggestionEngine.js';
import { AttributeIncreaseSuggestionEngine } from './AttributeIncreaseSuggestionEngine.js';
import { BuildIntent } from './BuildIntent.js';
import { ProgressionAdvisor } from './ProgressionAdvisor.js';
import { getSynergyForItem, findActiveSynergies } from './CommunityMetaSynergies.js';
import { PathPreview } from './PathPreview.js';

// Phase 1B: Suggestion Engine Enhancement Classes
import { SuggestionConfidence } from './SuggestionConfidence.js';
import { PlayerHistoryTracker } from './PlayerHistoryTracker.js';
import { BuildIdentityAnchor } from './BuildIdentityAnchor.js';
import { PivotDetector } from './PivotDetector.js';
import { SuggestionExplainer } from './SuggestionExplainer.js';
import { MentorProfile } from './MentorProfile.js';
import { SynergyEvaluator } from './SynergyEvaluator.js';
import { BuildCoherenceAnalyzer } from './BuildCoherenceAnalyzer.js';
import { OpportunityCostAnalyzer } from './OpportunityCostAnalyzer.js';
import { SuggestionEngineHooks } from './SuggestionEngineHooks.js';
import { getArchetypeConfig } from './ArchetypeDefinitions.js';

export class SuggestionEngineCoordinator {
  /**
   * Initialize all suggestion engines
   * Called during system ready hook
   */
  static async initialize() {
    try {
      SWSELogger.log('=== Initializing Suggestion Engine Coordinator ===');

      // Verify engines are available
      if (!SuggestionEngine) {
        throw new Error('SuggestionEngine not available');
      }
      if (!ClassSuggestionEngine) {
        throw new Error('ClassSuggestionEngine not available');
      }
      if (!BuildIntent) {
        throw new Error('BuildIntent not available');
      }

      // Phase 1B: Initialize enhancement classes
      SWSELogger.log('[Coordinator] Initializing Phase 1B suggestion engine classes');
      // Note: These are stubs in Phase 1B. Phase 1C will implement actual logic.
      // For now, they just validate imports and initialize storage structures.

      // Store reference in game.swse for global access
      game.swse = game.swse || {};
      game.swse.suggestions = {
        coordinator: this,
        suggestFeats: (feats, actor, pendingData, options) =>
          this.suggestFeats(feats, actor, pendingData, options),
        suggestTalents: (talents, actor, pendingData, options) =>
          this.suggestTalents(talents, actor, pendingData, options),
        suggestClasses: (classes, actor, pendingData, options) =>
          this.suggestClasses(classes, actor, pendingData, options),
        suggestBackgrounds: (backgrounds, actor, pendingData, options) =>
          this.suggestBackgrounds(backgrounds, actor, pendingData, options),
        suggestForceOptions: (options, actor, pendingData, contextOptions) =>
          this.suggestForceOptions(options, actor, pendingData, contextOptions),
        suggestLevel1Skills: (skills, actor, pendingData) =>
          this.suggestLevel1Skills(skills, actor, pendingData),
        suggestAttributeIncreases: (actor, pendingData, contextOptions) =>
          this.suggestAttributeIncreases(actor, pendingData, contextOptions),
        analyzeBuildIntent: (actor, pendingData) =>
          this.analyzeBuildIntent(actor, pendingData),
        deriveAttributeBuildIntent: (actor) =>
          this.deriveAttributeBuildIntent(actor),
        applyAttributeWeight: (baseTier, buildIntent, relevantAttribute, options) =>
          this.applyAttributeWeight(baseTier, buildIntent, relevantAttribute, options),
        getActiveSynergies: (actor, pendingData) =>
          this.getActiveSynergies(actor, pendingData),
        generatePathPreviews: (actor, pendingData) =>
          this.generatePathPreviews(actor, pendingData),
        getForceOptionCatalog: () =>
          this.getForceOptionCatalog(),
        getAbilityIcon: (ability) =>
          this.getAbilityIcon(ability),
        getAbilityName: (abbrev) =>
          this.getAbilityName(abbrev),
        clearBuildIntentCache: (actorId) =>
          this.clearBuildIntentCache(actorId)
      };

      // Phase 1B: Wire event hooks (callbacks implemented in Phase 1C)
      SWSELogger.log('[Coordinator] Wiring suggestion engine event hooks');
      SuggestionEngineHooks.initialize();

      SWSELogger.log('=== Suggestion Engine Coordinator initialized ===');
      Hooks.callAll('swse:suggestions:initialized');
      return true;
    } catch (err) {
      SWSELogger.error('Failed to initialize Suggestion Engine Coordinator:', err);
      ui.notifications?.error('Failed to initialize suggestion engines');
      return false;
    }
  }

  /**
   * Cache for BuildIntent analysis per actor
   * Prevents redundant computation during a single level-up session
   * @private
   */
  static _buildIntentCache = new Map();

  /**
   * Analyze character's build direction (cached)
   * @param {Actor} actor - The character
   * @param {Object} pendingData - Pending selections from level-up
   * @returns {Promise<Object>} BuildIntent analysis
   */
  static async analyzeBuildIntent(actor, pendingData = {}) {
    try {
      SWSELogger.log(`[SUGGESTION-COORDINATOR] analyzeBuildIntent() START - Actor: ${actor.id} (${actor.name})`);
      const cacheKey = `${actor.id}_${JSON.stringify(pendingData)}`;

      // Return cached result if available
      if (this._buildIntentCache.has(cacheKey)) {
        SWSELogger.log(`[SUGGESTION-COORDINATOR] analyzeBuildIntent() - Returning CACHED build intent for actor ${actor.id}`);
        return this._buildIntentCache.get(cacheKey);
      }

      // Compute and cache
      SWSELogger.log(`[SUGGESTION-COORDINATOR] analyzeBuildIntent() - Computing NEW build intent for actor ${actor.id}`);
      const buildIntent = await BuildIntent.analyze(actor, pendingData);
      this._buildIntentCache.set(cacheKey, buildIntent);
      SWSELogger.log(`[SUGGESTION-COORDINATOR] analyzeBuildIntent() COMPLETE - BuildIntent analysis finished`);

      return buildIntent;
    } catch (err) {
      SWSELogger.error('[SUGGESTION-COORDINATOR] BuildIntent analysis failed:', err);
      throw err;
    }
  }

  /**
   * Clear BuildIntent cache for an actor
   * Called when starting a new level-up session
   * @param {string} actorId - Actor ID to clear cache for
   */
  static clearBuildIntentCache(actorId) {
    const keysToDelete = [];
    for (const key of this._buildIntentCache.keys()) {
      if (key.startsWith(actorId)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this._buildIntentCache.delete(key));
    SWSELogger.log(`Cleared BuildIntent cache for actor ${actorId}`);
  }

  /**
   * Suggest feats with integrated BuildIntent context
   * @param {Array} feats - Array of feat objects
   * @param {Actor} actor - The character
   * @param {Object} pendingData - Pending selections
   * @param {Object} options - Additional options (featMetadata, etc)
   * @returns {Promise<Array>} Feats with suggestion metadata
   */
  static async suggestFeats(feats, actor, pendingData = {}, options = {}) {
    try {
      SWSELogger.log(`[SUGGESTION-COORDINATOR] suggestFeats() START - Actor: ${actor.id}, Available feats: ${feats.length}`);
      // Get or compute BuildIntent for context
      const buildIntent = options.buildIntent || await this.analyzeBuildIntent(actor, pendingData);
      SWSELogger.log(`[SUGGESTION-COORDINATOR] suggestFeats() - BuildIntent obtained, primary themes:`, buildIntent.primaryThemes);

      // Call SuggestionEngine with BuildIntent context
      const featsSuggested = await SuggestionEngine.suggestFeats(
        feats,
        actor,
        pendingData,
        {
          ...options,
          buildIntent
        }
      );

      SWSELogger.log(`[SUGGESTION-COORDINATOR] suggestFeats() COMPLETE - Returned ${featsSuggested.length} feat suggestions`);
      return featsSuggested;
    } catch (err) {
      SWSELogger.error('[SUGGESTION-COORDINATOR] Feat suggestion failed:', err);
      // Return feats without suggestions as fallback
      return feats.map(f => ({
        ...f,
        suggestion: {
          tier: 0,
          reason: 'Legal option',
          icon: ''
        }
      }));
    }
  }

  /**
   * Suggest talents with integrated BuildIntent context
   * @param {Array} talents - Array of talent objects
   * @param {Actor} actor - The character
   * @param {Object} pendingData - Pending selections
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} Talents with suggestion metadata
   */
  static async suggestTalents(talents, actor, pendingData = {}, options = {}) {
    try {
      // Get or compute BuildIntent for context
      const buildIntent = options.buildIntent || await this.analyzeBuildIntent(actor, pendingData);

      // Call SuggestionEngine with BuildIntent context
      const talentsSuggested = await SuggestionEngine.suggestTalents(
        talents,
        actor,
        pendingData,
        {
          ...options,
          buildIntent
        }
      );

      return talentsSuggested;
    } catch (err) {
      SWSELogger.error('Talent suggestion failed:', err);
      // Return talents without suggestions as fallback
      return talents.map(t => ({
        ...t,
        suggestion: {
          tier: 0,
          reason: 'Legal option',
          icon: ''
        }
      }));
    }
  }

  /**
   * Suggest classes with integrated BuildIntent context
   * @param {Array} classes - Array of class objects
   * @param {Actor} actor - The character
   * @param {Object} pendingData - Pending selections
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} Classes with suggestion metadata
   */
  static async suggestClasses(classes, actor, pendingData = {}, options = {}) {
    try {
      // Get or compute BuildIntent for context
      const buildIntent = options.buildIntent || await this.analyzeBuildIntent(actor, pendingData);

      // Call ClassSuggestionEngine with BuildIntent context
      const classesSuggested = await ClassSuggestionEngine.suggestClasses(
        classes,
        actor,
        pendingData,
        {
          ...options,
          buildIntent
        }
      );

      return classesSuggested;
    } catch (err) {
      SWSELogger.error('Class suggestion failed:', err);
      // Return classes without suggestions as fallback
      return classes.map(c => ({
        ...c,
        isSuggested: false,
        suggestion: {
          tier: 0,
          reason: 'Legal option'
        }
      }));
    }
  }

  /**
   * Suggest backgrounds based on character's class, species, abilities, and build
   * @param {Array} backgrounds - Array of background objects
   * @param {Actor} actor - The character (or temp actor for chargen)
   * @param {Object} pendingData - Pending character data from chargen
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} Backgrounds with suggestion metadata
   */
  static async suggestBackgrounds(backgrounds, actor, pendingData = {}, options = {}) {
    try {
      // Call BackgroundSuggestionEngine to score and rank backgrounds
      const backgroundsSuggested = await BackgroundSuggestionEngine.suggestBackgrounds(
        backgrounds,
        actor,
        pendingData
      );

      return backgroundsSuggested;
    } catch (err) {
      SWSELogger.error('Background suggestion failed:', err);
      // Return backgrounds without suggestions as fallback
      return backgrounds.map(b => ({
        ...b,
        suggestion: {
          tier: 0,
          reason: 'Valid option',
          icon: ''
        }
      }));
    }
  }

  /**
   * Get active meta synergies for the character's current build
   * @param {Actor} actor - The character
   * @param {Object} pendingData - Pending selections
   * @returns {Promise<Array>} Active synergy combinations
   */
  static async getActiveSynergies(actor, pendingData = {}) {
    try {
      return findActiveSynergies(actor, pendingData);
    } catch (err) {
      SWSELogger.error('Active synergy detection failed:', err);
      return [];
    }
  }

  /**
   * Generate prestige class qualification previews
   * @param {Actor} actor - The character
   * @param {Object} pendingData - Pending selections
   * @returns {Promise<Array>} Path preview data
   */
  static async generatePathPreviews(actor, pendingData = {}) {
    try {
      return await PathPreview.generatePreviews(actor, pendingData);
    } catch (err) {
      SWSELogger.error('Path preview generation failed:', err);
      return [];
    }
  }

  /**
   * Suggest Force options (powers, secrets, techniques)
   * @param {Array} options - Array of Force options to suggest from
   * @param {Actor} actor - The character
   * @param {Object} pendingData - Pending selections
   * @param {Object} contextOptions - Additional options (buildIntent, etc)
   * @returns {Promise<Array>} Force options with suggestion metadata
   */
  static async suggestForceOptions(options, actor, pendingData = {}, contextOptions = {}) {
    try {
      // Get or compute BuildIntent for context
      const buildIntent = contextOptions.buildIntent || await this.analyzeBuildIntent(actor, pendingData);

      // Call ForceOptionSuggestionEngine with BuildIntent context
      const optionsSuggested = await ForceOptionSuggestionEngine.suggestForceOptions(
        options,
        actor,
        pendingData,
        {
          ...contextOptions,
          buildIntent
        }
      );

      return optionsSuggested;
    } catch (err) {
      SWSELogger.error('Force option suggestion failed:', err);
      // Return options without suggestions as fallback
      return options.map(opt => ({
        ...opt,
        suggestion: {
          tier: 0,
          reason: 'Available',
          icon: ''
        },
        isSuggested: false
      }));
    }
  }

  /**
   * Get the Force option catalog
   * Useful for UI components that need the full list of options
   * @returns {Object} Force options catalog
   */
  static getForceOptionCatalog() {
    return ForceOptionSuggestionEngine.FORCE_OPTIONS_CATALOG || {};
  }

  /**
   * Suggest skills for level 1 characters with attribute weighting
   * @param {Array} skills - Available skills to suggest from
   * @param {Actor} actor - The character
   * @param {Object} pendingData - Pending selections (class, abilities)
   * @returns {Promise<Array>} Skills with suggestion metadata
   */
  static async suggestLevel1Skills(skills, actor, pendingData = {}) {
    try {
      return await ProgressionAdvisor.suggestLevel1Skills(skills, actor, pendingData);
    } catch (err) {
      SWSELogger.error('Level 1 skill suggestion failed:', err);
      return skills.map(skill => ({
        ...skill,
        suggestion: {
          tier: 0,
          reason: 'Available',
          icon: ''
        },
        isSuggested: false
      }));
    }
  }

  /**
   * Suggest attribute increases with integrated BuildIntent context
   * Called at levels 4, 8, 12, 16, 20
   * @param {Actor} actor - The character
   * @param {Object} pendingData - Pending selections (trained skills, etc)
   * @param {Object} contextOptions - Additional options (buildIntent, etc)
   * @returns {Promise<Array>} Abilities with suggestion metadata
   */
  static async suggestAttributeIncreases(actor, pendingData = {}, contextOptions = {}) {
    try {
      // Get or compute BuildIntent for context
      const buildIntent = contextOptions.buildIntent || await this.analyzeBuildIntent(actor, pendingData);

      // Call AttributeIncreaseSuggestionEngine with BuildIntent context
      const attributesSuggested = await AttributeIncreaseSuggestionEngine.suggestAttributeIncreases(
        actor,
        pendingData,
        {
          ...contextOptions,
          buildIntent
        }
      );

      return attributesSuggested;
    } catch (err) {
      SWSELogger.error('Attribute increase suggestion failed:', err);
      // Return empty array as fallback (attribute increases are optional)
      return [];
    }
  }

  /**
   * Derive attribute-aware build profile for a character
   * @param {Actor} actor - The character
   * @returns {Object} Attribute build profile with ability analysis
   */
  static deriveAttributeBuildIntent(actor) {
    return ProgressionAdvisor.deriveAttributeBuildIntent(actor);
  }

  /**
   * Apply attribute weighting to any suggestion tier
   * Attributes influence PRIORITY, never legality
   * @param {number} baseTier - Base suggestion tier
   * @param {Object} buildIntent - Attribute build profile
   * @param {string} relevantAttribute - Ability synergy
   * @param {Object} options - Weighting options
   * @returns {number} Weighted tier
   */
  static applyAttributeWeight(baseTier, buildIntent, relevantAttribute, options = {}) {
    return ProgressionAdvisor.applyAttributeWeight(baseTier, buildIntent, relevantAttribute, options);
  }

  /**
   * Get ability icon for UI rendering
   * @param {string} ability - Ability name or abbrev
   * @returns {string} FontAwesome class
   */
  static getAbilityIcon(ability) {
    return ProgressionAdvisor.getAbilityIcon(ability);
  }

  /**
   * Get ability full name
   * @param {string} abbrev - Ability abbreviation
   * @returns {string} Full ability name
   */
  static getAbilityName(abbrev) {
    return ProgressionAdvisor.getAbilityName(abbrev);
  }

  /**
   * Reset coordinator (for testing or system reset)
   */
  static reset() {
    this._buildIntentCache.clear();
    SWSELogger.log('Suggestion Engine Coordinator reset');
  }
}

export default SuggestionEngineCoordinator;
