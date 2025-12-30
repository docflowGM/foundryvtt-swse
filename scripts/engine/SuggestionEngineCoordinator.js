/**
 * SWSE Suggestion Engine Coordinator
 *
 * Provides a unified, centralized interface for all suggestion engines:
 * - SuggestionEngine (feats/talents)
 * - ClassSuggestionEngine (classes)
 * - ForceOptionSuggestionEngine (Force powers, secrets, techniques)
 * - BuildIntent (build direction analysis)
 * - CommunityMetaSynergies (meta synergy detection)
 *
 * This coordinator handles:
 * - Engine initialization
 * - BuildIntent computation and caching
 * - API exposure through game.swse
 * - Integration with progression engine
 * - State management across level-ups
 */

import { SWSELogger } from '../utils/logger.js';
import { SuggestionEngine } from './SuggestionEngine.js';
import { ClassSuggestionEngine } from './ClassSuggestionEngine.js';
import { ForceOptionSuggestionEngine } from './ForceOptionSuggestionEngine.js';
import { BuildIntent } from './BuildIntent.js';
import { getSynergyForItem, findActiveSynergies } from './CommunityMetaSynergies.js';
import { PathPreview } from './PathPreview.js';

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
        analyzeBuildIntent: (actor, pendingData) =>
          this.analyzeBuildIntent(actor, pendingData),
        getActiveSynergies: (actor, pendingData) =>
          this.getActiveSynergies(actor, pendingData),
        generatePathPreviews: (actor, pendingData) =>
          this.generatePathPreviews(actor, pendingData),
        getForceOptionCatalog: () =>
          this.getForceOptionCatalog(),
        clearBuildIntentCache: (actorId) =>
          this.clearBuildIntentCache(actorId)
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
   * Suggest feats with integrated BuildIntent context
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
      const featsSuggested = await SuggestionEngine.suggestFeats(
        feats,
        actor,
        pendingData,
        {
          ...options,
          buildIntent
        }
      );

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
   * Reset coordinator (for testing or system reset)
   */
  static reset() {
    this._buildIntentCache.clear();
    SWSELogger.log('Suggestion Engine Coordinator reset');
  }
}

export default SuggestionEngineCoordinator;
