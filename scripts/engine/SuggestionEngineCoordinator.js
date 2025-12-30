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
import { ForceOptionSuggestionEngine } from './ForceOptionSuggestionEngine.js';
import { Level1SkillSuggestionEngine } from './Level1SkillSuggestionEngine.js';
import { AttributeIncreaseSuggestionEngine } from './AttributeIncreaseSuggestionEngine.js';
import { BuildIntent } from './BuildIntent.js';
import { ProgressionAdvisor } from './ProgressionAdvisor.js';
import { getSynergyForItem, findActiveSynergies } from './CommunityMetaSynergies.js';
import { PathPreview } from './PathPreview.js';
import { BiasPrecisionEngine } from './BiasPrecisionEngine.js';
import { HybridMLEngine } from './HybridMLEngine.js';

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
          this.clearBuildIntentCache(actorId),
        // Hybrid ML and Bias Precision APIs
        recordDecision: (actor, type, tier, accepted, itemName) =>
          BiasPrecisionEngine.recordDecision(actor, type, tier, accepted, itemName),
        getBiasStatistics: (actor, type) =>
          BiasPrecisionEngine.getStatistics(actor, type),
        clearBiasProfile: (actor) =>
          BiasPrecisionEngine.clearProfile(actor),
        analyzeArchetypes: (actor, pendingData) =>
          HybridMLEngine.analyzeArchetypes(actor, pendingData),
        getArchetypeRecommendations: (actor, itemType, pendingData) =>
          HybridMLEngine.getArchetypeRecommendations(actor, itemType, pendingData),
        getHybridWeight: (actor, itemName, itemType, baseTier, pendingData) =>
          HybridMLEngine.getHybridWeight(actor, itemName, itemType, baseTier, pendingData)
      };

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
      const cacheKey = `${actor.id}_${JSON.stringify(pendingData)}`;

      // Return cached result if available
      if (this._buildIntentCache.has(cacheKey)) {
        return this._buildIntentCache.get(cacheKey);
      }

      // Compute and cache
      const buildIntent = await BuildIntent.analyze(actor, pendingData);
      this._buildIntentCache.set(cacheKey, buildIntent);

      return buildIntent;
    } catch (err) {
      SWSELogger.error('BuildIntent analysis failed:', err);
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
   * Suggest feats with integrated BuildIntent context and hybrid ML weighting
   * @param {Array} feats - Array of feat objects
   * @param {Actor} actor - The character
   * @param {Object} pendingData - Pending selections
   * @param {Object} options - Additional options (featMetadata, etc)
   * @returns {Promise<Array>} Feats with suggestion metadata
   */
  static async suggestFeats(feats, actor, pendingData = {}, options = {}) {
    try {
      // Get or compute BuildIntent for context
      const buildIntent = options.buildIntent || await this.analyzeBuildIntent(actor, pendingData);

      // Call SuggestionEngine with BuildIntent context
      let featsSuggested = await SuggestionEngine.suggestFeats(
        feats,
        actor,
        pendingData,
        {
          ...options,
          buildIntent
        }
      );

      // Apply hybrid ML weighting if enabled (default: true)
      if (options.applyHybridML !== false) {
        featsSuggested = this._applyHybridMLWeighting(
          featsSuggested,
          actor,
          'feat',
          pendingData
        );

        // Re-sort after applying weights
        featsSuggested = SuggestionEngine.sortBySuggestion(featsSuggested);
      }

      return featsSuggested;
    } catch (err) {
      SWSELogger.error('Feat suggestion failed:', err);
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
   * Suggest talents with integrated BuildIntent context and hybrid ML weighting
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
      let talentsSuggested = await SuggestionEngine.suggestTalents(
        talents,
        actor,
        pendingData,
        {
          ...options,
          buildIntent
        }
      );

      // Apply hybrid ML weighting if enabled (default: true)
      if (options.applyHybridML !== false) {
        talentsSuggested = this._applyHybridMLWeighting(
          talentsSuggested,
          actor,
          'talent',
          pendingData
        );

        // Re-sort after applying weights
        talentsSuggested = SuggestionEngine.sortBySuggestion(talentsSuggested);
      }

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
   * Apply hybrid ML weighting to suggestions
   * Combines online learning (player preferences) with archetype recognition
   * @param {Array} items - Items with suggestion metadata
   * @param {Actor} actor - The character
   * @param {string} itemType - Type of items (feat, talent, class, etc)
   * @param {Object} pendingData - Pending selections
   * @returns {Array} Items with weighted suggestion tiers
   * @private
   */
  static _applyHybridMLWeighting(items, actor, itemType, pendingData) {
    return items.map(item => {
      // Skip if no suggestion or fallback tier
      if (!item.suggestion || item.suggestion.tier === 0) {
        return item;
      }

      try {
        // Get hybrid weight from ML engine
        const hybridData = HybridMLEngine.getHybridWeight(
          actor,
          item.name,
          itemType,
          item.suggestion.tier,
          pendingData
        );

        // Apply weight to tier (conceptual - tier stays same, but we add weight info)
        // Weight > 1.0 means boosted, < 1.0 means reduced
        const weightedTier = item.suggestion.tier * hybridData.weight;

        return {
          ...item,
          suggestion: {
            ...item.suggestion,
            // Store original tier
            baseTier: item.suggestion.tier,
            // Store weighted tier for sorting (fractional tiers allow fine-grained ordering)
            tier: weightedTier,
            // Enhance reason with ML insights
            mlReason: hybridData.reason,
            mlSources: hybridData.sources,
            // Store weight for debugging
            mlWeight: hybridData.weight
          }
        };
      } catch (err) {
        SWSELogger.error(`Failed to apply hybrid ML weighting to ${item.name}:`, err);
        return item;
      }
    });
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
