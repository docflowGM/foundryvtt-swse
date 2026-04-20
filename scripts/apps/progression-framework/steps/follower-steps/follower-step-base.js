/**
 * FollowerStepBase — Base class for all follower-specific progression steps
 *
 * Provides common utilities for follower progression:
 * - Access to owner actor via dependency context
 * - Helper methods for template-constrained choices
 * - Session state management
 *
 * All follower steps enforce tight constraints:
 * - Template-aware skill/feat/language selection
 * - Persistent choice preservation across updates
 * - Derived state calculations at owner heroic level
 */

import { ProgressionStepPlugin } from '../step-plugin-base.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class FollowerStepBase extends ProgressionStepPlugin {
  /**
   * Get the owner actor from dependency context.
   * All follower steps have an owner.
   *
   * @param {ProgressionShell} shell
   * @returns {Actor|null}
   */
  getOwnerActor(shell) {
    const ownerActorId = shell.progressionSession?.dependencyContext?.ownerActorId;
    if (!ownerActorId) return null;
    return game.actors.get(ownerActorId);
  }

  /**
   * Get current follower choices from session or existing follower.
   *
   * @param {ProgressionShell} shell
   * @returns {Object} {speciesName, templateType, skillChoices, featChoices, languageChoices, backgroundChoice}
   */
  getFollowerChoices(shell) {
    const session = shell.progressionSession;

    // Start with persistent choices from dependency context or existing follower
    const persistentChoices = session?.dependencyContext?.persistentChoices || {};

    // Build current choices from session draft state
    return {
      speciesName: persistentChoices.speciesName || session?.draftSelections?.speciesName || null,
      templateType: persistentChoices.templateType || session?.draftSelections?.templateType || null,
      skillChoices: session?.draftSelections?.followerSkills || [],
      featChoices: session?.draftSelections?.followerFeats || [],
      languageChoices: session?.draftSelections?.followerLanguages || [],
      backgroundChoice: session?.draftSelections?.followerBackground || null,
    };
  }

  /**
   * Save a choice to session draft state.
   * CRITICAL: Use session.draftSelections, not committedSelections.
   *
   * @param {ProgressionShell} shell
   * @param {string} choiceType - 'speciesName', 'templateType', etc.
   * @param {*} value - The choice value
   */
  saveFollowerChoice(shell, choiceType, value) {
    if (!shell.progressionSession) return;

    shell.progressionSession.draftSelections = shell.progressionSession.draftSelections || {};
    shell.progressionSession.draftSelections[choiceType] = value;

    swseLogger.debug('[FollowerStep] Saved choice:', { choiceType, value });
  }

  /**
   * Get follower templates from FollowerCreator.
   *
   * @returns {Promise<Object>} {aggressive: {...}, defensive: {...}, utility: {...}}
   */
  async getFollowerTemplates() {
    const { FollowerCreator } = await import('../../../follower-creator.js');
    return await FollowerCreator.getFollowerTemplates();
  }

  /**
   * Get follower-compatible species (subset of all species that are valid for followers).
   * CONSTRAINT: Not all species are follower-compatible; this filters appropriately.
   *
   * @returns {Promise<Array>} Array of species names valid for followers
   */
  async getFollowerCompatibleSpecies() {
    // Phase 3: For now, all species are follower-compatible.
    // Future: Add follower-specific species filtering if needed.
    const { SpeciesRegistry } = await import('/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js');

    if (!SpeciesRegistry.isInitialized()) {
      await SpeciesRegistry.initialize();
    }

    const allSpecies = SpeciesRegistry.getAll();
    return allSpecies; // Return all; filtering deferred to UI layer if needed
  }

  /**
   * Get valid feats for a follower of a specific template.
   * CONSTRAINT: Heavily restricted compared to normal character progression.
   *
   * Followers get:
   * - Weapon Proficiency (Simple Weapons) — all templates
   * - Template-specific feats only (Aggressive/Defensive/Utility)
   *
   * @param {string} templateType - 'aggressive', 'defensive', 'utility'
   * @returns {Promise<Array>} Array of legal follower feat IDs
   */
  async getFollowerFeatsForTemplate(templateType) {
    // Phase 3: Follower feats are template-specific and heavily constrained.
    // This will be populated from FollowerCreator's template definitions.
    // For now, return empty array — will be populated when feat constraints are defined.

    const templates = await this.getFollowerTemplates();
    const template = templates[templateType];

    if (!template) {
      swseLogger.warn('[FollowerStepBase] Unknown template:', templateType);
      return [];
    }

    // Follower feats come from template definition
    // Phase 3 planned: Define follower-specific feat allowances in template
    return template.legalFeats || [];
  }

  /**
   * Get valid skills for a follower of a specific template.
   * CONSTRAINT: Heavily restricted compared to normal character progression.
   *
   * Template-specific skill allowances:
   * - Aggressive: Endurance only
   * - Defensive: Endurance only
   * - Utility: One choice (but NOT Use the Force)
   *
   * @param {string} templateType - 'aggressive', 'defensive', 'utility'
   * @returns {Promise<Array>} Array of legal skill names for this template
   */
  async getFollowerSkillsForTemplate(templateType) {
    switch (templateType) {
      case 'aggressive':
      case 'defensive':
        // Only Endurance
        return ['Endurance'];

      case 'utility':
        // One choice except Use the Force
        // Phase 3: Full skill list minus Use the Force
        return [
          'Acrobatics',
          'Athletics',
          'Deception',
          'Endurance',
          'Insight',
          'Intimidate',
          'Investigation',
          'Medicine',
          'Perception',
          'Persuasion',
          'Piloting',
          'Stealth',
          'Survival',
          // NOT 'Use the Force'
        ];

      default:
        return [];
    }
  }

  /**
   * Get owner's native language and languages shared with owner.
   * Followers always know their native language + languages shared with owner.
   *
   * @param {Actor} ownerActor - The owner character
   * @param {string} speciesName - Follower species name (determines native language)
   * @returns {Promise<Object>} {native: string, available: string[]}
   */
  async getFollowerLanguages(ownerActor, speciesName) {
    try {
      // Get native language from species
      let native = 'Basic'; // Fallback

      if (speciesName) {
        const { SpeciesRegistry } = await import('/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js');

        // Ensure registry is initialized
        if (!SpeciesRegistry.isInitialized()) {
          await SpeciesRegistry.initialize();
        }

        const species = SpeciesRegistry.getByName(speciesName);
        if (species?.languages && species.languages.length > 0) {
          // Use first language as native language
          native = species.languages[0];
        }
      }

      // Get owner's languages
      const ownerLanguages = ownerActor?.system?.languages || [];

      swseLogger.log('[FollowerStepBase] Resolved languages:', {
        native,
        ownerLanguages: Array.isArray(ownerLanguages) ? ownerLanguages : [ownerLanguages]
      });

      return {
        native,
        available: Array.isArray(ownerLanguages) ? ownerLanguages : [ownerLanguages]
      };
    } catch (err) {
      swseLogger.error('[FollowerStepBase] Error resolving languages:', err);
      // Fallback to safe defaults
      return {
        native: 'Basic',
        available: []
      };
    }
  }
}
