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

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { SuggestionService } from "/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionService.js";
import { SuggestionEngine } from "/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionEngine.js";
import { ClassSuggestionEngine } from "/systems/foundryvtt-swse/scripts/engine/suggestion/ClassSuggestionEngine.js";
import { BackgroundSuggestionEngine } from "/systems/foundryvtt-swse/scripts/engine/suggestion/BackgroundSuggestionEngine.js";
import { ForceOptionSuggestionEngine } from "/systems/foundryvtt-swse/scripts/engine/suggestion/ForceOptionSuggestionEngine.js";
import { Level1SkillSuggestionEngine } from "/systems/foundryvtt-swse/scripts/engine/suggestion/Level1SkillSuggestionEngine.js";
import { AttributeIncreaseSuggestionEngine } from "/systems/foundryvtt-swse/scripts/engine/suggestion/AttributeIncreaseSuggestionEngine.js";
import { SpeciesSuggestionEngine } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/species-suggestion-engine.js";
import { LanguageSuggestionEngine } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/language-suggestion-engine.js";
import { ForceSecretSuggestionEngine } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/force-secret-suggestion-engine.js";
import { ForceTechniqueSuggestionEngine } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/force-technique-suggestion-engine.js";
import { DroidSuggestionEngine } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/droid-suggestion-engine.js";  // PHASE D
import { BuildIntent } from "/systems/foundryvtt-swse/scripts/engine/suggestion/BuildIntent.js";
import { IdentityEngine } from "/systems/foundryvtt-swse/scripts/engine/prestige/identity-engine.js";
import { ProgressionAdvisor } from "/systems/foundryvtt-swse/scripts/engine/suggestion/ProgressionAdvisor.js";
import { getSynergyForItem, findActiveSynergies } from "/systems/foundryvtt-swse/scripts/engine/suggestion/CommunityMetaSynergies.js";
import { PathPreview } from "/systems/foundryvtt-swse/scripts/engine/suggestion/PathPreview.js";

// Phase 1B: Suggestion Engine Enhancement Classes
import { SuggestionConfidence } from "/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionConfidence.js";
import { PlayerHistoryTracker } from "/systems/foundryvtt-swse/scripts/engine/suggestion/PlayerHistoryTracker.js";
import { BuildIdentityAnchor } from "/systems/foundryvtt-swse/scripts/engine/suggestion/BuildIdentityAnchor.js";
import { PivotDetector } from "/systems/foundryvtt-swse/scripts/engine/suggestion/PivotDetector.js";
import { SuggestionExplainer } from "/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionExplainer.js";
import { MentorProfile } from "/systems/foundryvtt-swse/scripts/engine/suggestion/MentorProfile.js";
import { SynergyEvaluator } from "/systems/foundryvtt-swse/scripts/engine/suggestion/SynergyEvaluator.js";
import { BuildCoherenceAnalyzer } from "/systems/foundryvtt-swse/scripts/engine/suggestion/BuildCoherenceAnalyzer.js";
import { OpportunityCostAnalyzer } from "/systems/foundryvtt-swse/scripts/engine/suggestion/OpportunityCostAnalyzer.js";
import { SuggestionEngineHooks } from "/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionEngineHooks.js";
import { getArchetypeConfig } from "/systems/foundryvtt-swse/scripts/engine/suggestion/ArchetypeDefinitions.js";

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
        // Single entry point (preferred)
        getSuggestions: (actor, context, options) => SuggestionService.getSuggestions(actor, context, options),
        getSuggestionDiff: (actor, context, suggestions) => SuggestionService.getSuggestionDiff(actor, context, suggestions),
        invalidateSuggestions: (actorId) => SuggestionService.invalidate(actorId),
        suggestFeats: (feats, actor, pendingData, options) =>
          this.suggestFeats(feats, actor, pendingData, options),
        suggestTalents: (talents, actor, pendingData, options) =>
          this.suggestTalents(talents, actor, pendingData, options),
        suggestClasses: (classes, actor, pendingData, options) =>
          this.suggestClasses(classes, actor, pendingData, options),
        suggestBackgrounds: (backgrounds, actor, pendingData, options) =>
          this.suggestBackgrounds(backgrounds, actor, pendingData, options),
        suggestSpecies: (species, actor, pendingData, options) =>
          this.suggestSpecies(species, actor, pendingData, options),
        suggestLanguages: (languages, actor, pendingData, options) =>
          this.suggestLanguages(languages, actor, pendingData, options),
        suggestForceSecrets: (secrets, actor, pendingData, options) =>
          this.suggestForceSecrets(secrets, actor, pendingData, options),
        suggestForceTechniques: (techniques, actor, pendingData, options) =>
          this.suggestForceTechniques(techniques, actor, pendingData, options),
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
        suggestDroidSystems: (systems, actor, pendingData, options) =>
          this.suggestDroidSystems(systems, actor, pendingData, options),  // PHASE D
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
   * Generate a compact hash for pending data to use in cache keys
   * @private
   */
  static _hashPendingData(pendingData) {
    if (!pendingData || typeof pendingData !== 'object') {return '';}

    const parts = [];
    if (pendingData.selectedClass?.name) {
      parts.push(`c:${pendingData.selectedClass.name}`);
    }
    if (Array.isArray(pendingData.selectedFeats) && pendingData.selectedFeats.length) {
      parts.push(`f:${pendingData.selectedFeats.map(f => f.name || f).sort().join(',')}`);
    }
    if (Array.isArray(pendingData.selectedTalents) && pendingData.selectedTalents.length) {
      parts.push(`t:${pendingData.selectedTalents.map(t => t.name || t).sort().join(',')}`);
    }
    if (Array.isArray(pendingData.selectedSkills) && pendingData.selectedSkills.length) {
      parts.push(`s:${pendingData.selectedSkills.map(s => s.key || s.name || s).sort().join(',')}`);
    }
    if (pendingData.mentorBiases && Object.keys(pendingData.mentorBiases).length) {
      parts.push(`mb:${Object.keys(pendingData.mentorBiases).sort().join(',')}`);
    }
    return parts.join('|');
  }

  /**
   * Analyze character's build direction (cached)
   * @param {Actor} actor - The character
   * @param {Object} pendingData - Pending selections from level-up
   * @returns {Promise<Object>} BuildIntent analysis
   */
  static async analyzeBuildIntent(actor, pendingData = {}) {
    try {
      SWSELogger.log(`[SUGGESTION-COORDINATOR] analyzeBuildIntent() START - Actor: ${actor.id} (${actor.name})`);
      // Use compact hash of pendingData for efficient, deterministic cache key
      const pendingHash = this._hashPendingData(pendingData);
      const cacheKey = `${actor.id}_${pendingHash}`;

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
   * Suggest feats with integrated BuildIntent and identity bias context
   * PHASE 2: Now also computes and passes identityBias directly from IdentityEngine
   *
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

      // PHASE 2: Compute identity bias directly from IdentityEngine
      const identityBias = options.identityBias || IdentityEngine.computeTotalBias(actor);
      SWSELogger.log(`[SUGGESTION-COORDINATOR] suggestFeats() - Identity bias computed from IdentityEngine`);

      // Call SuggestionEngine with BuildIntent and identity bias context
      const featsSuggested = await SuggestionEngine.suggestFeats(
        feats,
        actor,
        pendingData,
        {
          ...options,
          buildIntent,
          identityBias
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
   * Suggest talents with integrated BuildIntent and identity bias context
   * PHASE 2: Now also computes and passes identityBias directly from IdentityEngine
   *
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

      // PHASE 2: Compute identity bias directly from IdentityEngine
      const identityBias = options.identityBias || IdentityEngine.computeTotalBias(actor);

      // Call SuggestionEngine with BuildIntent and identity bias context
      const talentsSuggested = await SuggestionEngine.suggestTalents(
        talents,
        actor,
        pendingData,
        {
          ...options,
          buildIntent,
          identityBias
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
   * Suggest species based on character's class, abilities, and build synergy
   * @param {Array} species - Array of species objects
   * @param {Actor} actor - The character (or temp actor for chargen)
   * @param {Object} pendingData - Pending character data from chargen
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} Species with suggestion metadata
   */
  static async suggestSpecies(species, actor, pendingData = {}, options = {}) {
    try {
      // Get or compute BuildIntent for context
      const buildIntent = options.buildIntent || await this.analyzeBuildIntent(actor, pendingData);

      // Call SpeciesSuggestionEngine with BuildIntent context
      const speciesSuggested = await SpeciesSuggestionEngine.suggestSpecies(
        species,
        actor,
        pendingData,
        {
          ...options,
          buildIntent
        }
      );

      return speciesSuggested;
    } catch (err) {
      SWSELogger.error('Species suggestion failed:', err);
      // Return species without suggestions as fallback
      return species.map(s => ({
        ...s,
        suggestion: {
          confidence: 0.50,
          reason: 'Valid option'
        }
      }));
    }
  }

  /**
   * Suggest languages based on character's species, background, and class context
   * @param {Array} languages - Array of language objects
   * @param {Actor} actor - The character (or temp actor for chargen)
   * @param {Object} pendingData - Pending character data from chargen
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} Languages with suggestion metadata
   */
  static async suggestLanguages(languages, actor, pendingData = {}, options = {}) {
    try {
      // Call LanguageSuggestionEngine to score and rank languages
      const languagesSuggested = await LanguageSuggestionEngine.suggestLanguages(
        languages,
        actor,
        pendingData,
        options
      );

      return languagesSuggested;
    } catch (err) {
      SWSELogger.error('Language suggestion failed:', err);
      // Return languages without suggestions as fallback
      return languages.map(l => ({
        ...l,
        suggestion: {
          confidence: 0.50,
          reason: 'Available option'
        }
      }));
    }
  }

  /**
   * Suggest Force Secrets based on character's force commitment and archetype
   * @param {Array} secrets - Array of force secret objects
   * @param {Actor} actor - The character (or temp actor for chargen)
   * @param {Object} pendingData - Pending character data from chargen
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} Secrets with suggestion metadata
   */
  static async suggestForceSecrets(secrets, actor, pendingData = {}, options = {}) {
    try {
      // Call ForceSecretSuggestionEngine to score and rank secrets
      const secretsSuggested = await ForceSecretSuggestionEngine.suggestForceSecrets(
        secrets,
        actor,
        {
          ...options,
          pendingData
        }
      );

      return secretsSuggested;
    } catch (err) {
      SWSELogger.error('Force Secret suggestion failed:', err);
      // Return secrets without suggestions as fallback
      return secrets.map(s => ({
        ...s,
        suggestion: {
          tier: 0,
          reason: 'Available option'
        }
      }));
    }
  }

  /**
   * Suggest Force Techniques based on character's known powers and archetype
   * @param {Array} techniques - Array of force technique objects
   * @param {Actor} actor - The character (or temp actor for chargen)
   * @param {Object} pendingData - Pending character data from chargen
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} Techniques with suggestion metadata
   */
  static async suggestForceTechniques(techniques, actor, pendingData = {}, options = {}) {
    try {
      // Call ForceTechniqueSuggestionEngine to score and rank techniques
      const techniquesSuggested = await ForceTechniqueSuggestionEngine.suggestForceOptions(
        techniques,
        actor,
        {
          ...options,
          pendingData
        }
      );

      return techniquesSuggested;
    } catch (err) {
      SWSELogger.error('Force Technique suggestion failed:', err);
      // Return techniques without suggestions as fallback
      return techniques.map(t => ({
        ...t,
        suggestion: {
          tier: 0,
          reason: 'Available option'
        }
      }));
    }
  }

  /**
   * Suggest droid systems based on character's class, budget, and droid constraints
   * PHASE D: DroidSuggestionEngine recommendations for provisional and finalized modes
   *
   * @param {Object} systems - Droid systems organized by category (locomotion, processor, etc.)
   * @param {Actor} actor - The character (must be a droid)
   * @param {Object} pendingData - Pending character data from chargen
   * @param {Object} options - Engine options: {mode: 'preview'|'final', debug, allowOverflow}
   * @returns {Promise<Object>} Suggestions organized by system category
   */
  static async suggestDroidSystems(systems, actor, pendingData = {}, options = {}) {
    try {
      // Validate that this is a droid character
      if (!actor || !actor.system?.isDroid) {
        SWSELogger.warn('[Coordinator] suggestDroidSystems called for non-droid character');
        return {};
      }

      // Call DroidSuggestionEngine to score and rank systems by category
      const droidSuggestions = await DroidSuggestionEngine.suggestDroidSystems(
        systems,
        actor,
        pendingData,
        {
          ...options,
          mode: options.mode || 'preview',  // Default to preview mode
        }
      );

      return droidSuggestions;
    } catch (err) {
      SWSELogger.error('Droid system suggestion failed:', err);
      // Return empty suggestions object as fallback
      return {};
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
   * PHASE 2: Now also computes and passes identityBias directly from IdentityEngine
   *
   * @param {Array} options - Array of Force options to suggest from
   * @param {Actor} actor - The character
   * @param {Object} pendingData - Pending selections
   * @param {Object} contextOptions - Additional options (buildIntent, identityBias, etc)
   * @returns {Promise<Array>} Force options with suggestion metadata
   */
  static async suggestForceOptions(options, actor, pendingData = {}, contextOptions = {}) {
    try {
      // Get or compute BuildIntent for context
      const buildIntent = contextOptions.buildIntent || await this.analyzeBuildIntent(actor, pendingData);

      // PHASE 2: Compute identity bias directly from IdentityEngine
      const identityBias = contextOptions.identityBias || IdentityEngine.computeTotalBias(actor);

      // Call ForceOptionSuggestionEngine with BuildIntent and identity bias context
      const optionsSuggested = await ForceOptionSuggestionEngine.suggestForceOptions(
        options,
        actor,
        pendingData,
        {
          ...contextOptions,
          buildIntent,
          identityBias
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
   * Suggest attribute increases with integrated BuildIntent and identity bias context
   * Called at levels 4, 8, 12, 16, 20
   * PHASE 2: Now also computes and passes identityBias directly from IdentityEngine
   *
   * @param {Actor} actor - The character
   * @param {Object} pendingData - Pending selections (trained skills, etc)
   * @param {Object} contextOptions - Additional options (buildIntent, identityBias, etc)
   * @returns {Promise<Array>} Abilities with suggestion metadata
   */
  static async suggestAttributeIncreases(actor, pendingData = {}, contextOptions = {}) {
    try {
      // Get or compute BuildIntent for context
      const buildIntent = contextOptions.buildIntent || await this.analyzeBuildIntent(actor, pendingData);

      // PHASE 2: Compute identity bias directly from IdentityEngine
      const identityBias = contextOptions.identityBias || IdentityEngine.computeTotalBias(actor);

      // Call AttributeIncreaseSuggestionEngine with BuildIntent and identity bias context
      const attributesSuggested = await AttributeIncreaseSuggestionEngine.suggestAttributeIncreases(
        actor,
        pendingData,
        {
          ...contextOptions,
          buildIntent,
          identityBias
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
