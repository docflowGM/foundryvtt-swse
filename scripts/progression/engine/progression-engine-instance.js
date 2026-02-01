/**
 * SWSE Progression Engine - Instance-based API for UI
 *
 * This class provides an instance-based interface for the level-up UI.
 * It tracks pending selections and coordinates with all subsystems.
 * Integrates with SuggestionService for context-aware recommendations.
 */

import { SWSELogger } from '../../utils/logger.js';
import { SnapshotManager } from '../utils/snapshot-manager.js';
import { FeatEngine } from '../feats/feat-engine.js';
import { SkillEngine } from '../skills/skill-engine.js';
import { ForceProgressionEngine } from './force-progression.js';
import { ApplyHandlers } from '../utils/apply-handlers.js';
import { FinalizeIntegration } from '../integration/finalize-integration.js';
import { dispatchFeature } from './feature-dispatcher.js';
import { SuggestionService } from '../../engine/SuggestionService.js';

export class ProgressionEngine {
  /**
   * Create a new progression engine instance
   * @param {Actor} actor - The actor being leveled up
   * @param {string} mode - "levelup" or "chargen"
   */
  constructor(actor, mode = "levelup") {
    this.actor = actor;
    this.mode = mode;

    // Pending selections
    this.pending = {
      class: null,
      skills: [],
      feats: [],
      talents: [],
      forcePowers: [],
      forceSecrets: [],
      forceTechniques: [],
      languages: [],
      equipment: []
    };

    // Snapshot for rollback
    this.snapshot = null;

    SWSELogger.log(`ProgressionEngine (${mode}) initialized for ${actor.name}`);
  }

  /* ========================================
     CLASS SELECTION
     ======================================== */

  /**
   * Confirm class selection
   * @param {string} className - Name of the class
   */
  async confirmClass(className) {
    this.pending.class = className;
    SWSELogger.log(`Confirmed class: ${className}`);
  }

  /* ========================================
     SKILL SELECTION
     ======================================== */

  /**
   * Confirm one or more skills
   * @param {string|string[]} skills - Skill name(s)
   */
  async confirmSkills(skills) {
    const skillArray = Array.isArray(skills) ? skills : [skills];
    this.pending.skills = Array.from(new Set([...this.pending.skills, ...skillArray]));
    SWSELogger.log(`Confirmed skills: ${skillArray.join(', ')}`);
  }

  /* ========================================
     FEAT SELECTION
     ======================================== */

  /**
   * Confirm one or more feats
   * @param {string|string[]} feats - Feat name(s)
   */
  async confirmFeats(feats) {
    const featArray = Array.isArray(feats) ? feats : [feats];
    this.pending.feats = Array.from(new Set([...this.pending.feats, ...featArray]));
    SWSELogger.log(`Confirmed feats: ${featArray.join(', ')}`);
  }

  /* ========================================
     TALENT SELECTION
     ======================================== */

  /**
   * Confirm one or more talents
   * @param {string|string[]} talents - Talent name(s)
   */
  async confirmTalents(talents) {
    const talentArray = Array.isArray(talents) ? talents : [talents];
    this.pending.talents = Array.from(new Set([...this.pending.talents, ...talentArray]));
    SWSELogger.log(`Confirmed talents: ${talentArray.join(', ')}`);
  }

  /* ========================================
     FORCE SELECTIONS
     ======================================== */

  /**
   * Confirm one or more Force powers
   * @param {string|string[]} powers - Power name(s)
   */
  async confirmForcePowers(powers) {
    const powerArray = Array.isArray(powers) ? powers : [powers];
    this.pending.forcePowers = Array.from(new Set([...this.pending.forcePowers, ...powerArray]));
    SWSELogger.log(`Confirmed Force powers: ${powerArray.join(', ')}`);
  }

  /**
   * Confirm one or more Force secrets
   * @param {string|string[]} secrets - Secret name(s)
   */
  async confirmForceSecrets(secrets) {
    const secretArray = Array.isArray(secrets) ? secrets : [secrets];
    this.pending.forceSecrets = Array.from(new Set([...this.pending.forceSecrets, ...secretArray]));
    SWSELogger.log(`Confirmed Force secrets: ${secretArray.join(', ')}`);
  }

  /**
   * Confirm one or more Force techniques
   * @param {string|string[]} techniques - Technique name(s)
   */
  async confirmForceTechniques(techniques) {
    const techniqueArray = Array.isArray(techniques) ? techniques : [techniques];
    this.pending.forceTechniques = Array.from(new Set([...this.pending.forceTechniques, ...techniqueArray]));
    SWSELogger.log(`Confirmed Force techniques: ${techniqueArray.join(', ')}`);
  }

  /* ========================================
     FINALIZATION & ROLLBACK
     ======================================== */

  /**
   * Finalize all pending selections and apply to actor
   * @returns {boolean} true if successful
   */
  async finalize() {
    try {
      // Create snapshot before applying changes
      this.snapshot = await SnapshotManager.createSnapshot(
        this.actor,
        `Level-up snapshot (${this.actor.name})`
      );

      SWSELogger.log('Created snapshot before level-up');

      // Build feature array from pending selections
      const features = [];

      if (this.pending.class) {
        features.push({
          type: 'class_level',
          name: this.pending.class
        });
      }

      if (this.pending.skills.length > 0) {
        for (const skill of this.pending.skills) {
          features.push({
            type: 'skill_choice',
            name: skill
          });
        }
      }

      if (this.pending.feats.length > 0) {
        for (const feat of this.pending.feats) {
          features.push({
            type: 'feat_grant',
            name: feat
          });
        }
      }

      if (this.pending.talents.length > 0) {
        for (const talent of this.pending.talents) {
          features.push({
            type: 'talent_choice',
            name: talent
          });
        }
      }

      if (this.pending.forcePowers.length > 0) {
        for (const power of this.pending.forcePowers) {
          features.push({
            type: 'force_power_grant',
            name: power
          });
        }
      }

      if (this.pending.forceSecrets.length > 0) {
        for (const secret of this.pending.forceSecrets) {
          features.push({
            type: 'force_secret_grant',
            name: secret
          });
        }
      }

      if (this.pending.forceTechniques.length > 0) {
        for (const technique of this.pending.forceTechniques) {
          features.push({
            type: 'force_technique_grant',
            name: technique
          });
        }
      }

      // Dispatch all features through the feature dispatcher
      for (const feature of features) {
        try {
          await dispatchFeature(feature, this.actor, this);
          SWSELogger.log(`Applied feature: ${feature.type} - ${feature.name}`);
        } catch (err) {
          SWSELogger.error(`Failed to apply feature ${feature.name}:`, err);
        }
      }

      // Run final integration
      await FinalizeIntegration.quickIntegrate(this.actor, this);

      SWSELogger.log('Level-up finalized successfully');
      return true;

    } catch (err) {
      SWSELogger.error('Failed to finalize level-up:', err);
      throw err;
    }
  }

  /**
   * Rollback to snapshot
   */
  async rollback() {
    if (!this.snapshot) {
      SWSELogger.warn('No snapshot available for rollback');
      return false;
    }

    try {
      await SnapshotManager.restoreSnapshot(this.actor, this.snapshot.id);
      SWSELogger.log(`Rolled back to snapshot: ${this.snapshot.label}`);
      return true;
    } catch (err) {
      SWSELogger.error('Failed to rollback:', err);
      return false;
    }
  }

  /* ========================================
     UTILITY METHODS
     ======================================== */

  /**
   * Get all pending selections
   */
  getPending() {
    return JSON.parse(JSON.stringify(this.pending));
  }

  /**
   * Clear all pending selections
   */
  clearPending() {
    this.pending = {
      class: null,
      skills: [],
      feats: [],
      talents: [],
      forcePowers: [],
      forceSecrets: [],
      forceTechniques: [],
      languages: [],
      equipment: []
    };
  }

  /**
   * Check if any selections are pending
   */
  hasPending() {
    return this.pending.class !== null ||
           this.pending.skills.length > 0 ||
           this.pending.feats.length > 0 ||
           this.pending.talents.length > 0 ||
           this.pending.forcePowers.length > 0 ||
           this.pending.forceSecrets.length > 0 ||
           this.pending.forceTechniques.length > 0;
  }

  /* ========================================
     SUGGESTION ENGINE INTEGRATION
     ======================================== */

  /**
   * Get suggestions from the SuggestionService
   * Integrates with current progression context
   * Considers pending selections when scoring suggestions
   * @param {string} domain - Domain to suggest for ('feats', 'talents', 'forcepowers', etc.)
   * @param {Object} options - Additional options to pass to SuggestionService
   * @returns {Promise<Array>} Sorted array of suggestions for the domain
   */
  async getSuggestions(domain, options = {}) {
    try {
      const pendingData = {
        selectedClass: this.pending.class ? { name: this.pending.class } : null,
        selectedFeats: this.pending.feats,
        selectedTalents: this.pending.talents,
        selectedSkills: this.pending.skills,
        selectedPowers: this.pending.forcePowers
      };

      // Pass pending context to suggestion service for scoring
      const suggestions = await SuggestionService.getSuggestions(
        this.actor,
        this.mode,
        {
          domain,
          pendingData,
          ...options
        }
      );

      SWSELogger.log(`[PROGRESSION] Got ${suggestions.length} suggestions for domain: ${domain}`);
      return suggestions;
    } catch (err) {
      SWSELogger.error(`[PROGRESSION] Error getting suggestions for ${domain}:`, err);
      return [];
    }
  }
}

SWSELogger.log('ProgressionEngine (instance-based) module loaded');
