/**
 * Mentor Advisory Coordinator
 *
 * PHASE 4: Makes hidden but implemented mentor advisory modes discoverable and usable.
 *
 * The system has 33 complete mentor advisory stubs (stored in data/dialogue/mentors/{mentorId}/advisory_stub.json)
 * but they are not yet integrated into the mentor system. This coordinator:
 *
 * 1. Loads mentor advisory profiles and scaffolds
 * 2. Maps analytical signals (from BuildAnalysisEngine) to mentor advisory atoms
 * 3. Coordinates when to invoke different advisory modes
 * 4. Bridges analysis → mentor voice → player communication
 *
 * Advisory Modes (from schema v1.1):
 * - conflict: Build/commitment conflicts
 * - drift: Goal/path deviation
 * - prestige_planning: Prestige advancement
 * - strength_reinforcement: Positive reinforcement
 * - hybrid_identity: Multiple identity axes
 * - specialization_warning: Specialization gaps
 * - momentum: Progression momentum
 * - long_term_trajectory: Forward-looking planning
 *
 * Usage:
 *   const advisory = await MentorAdvisoryCoordinator.generateAdvisory(actor, mentorId, 'conflict');
 *   const bridged = await MentorAdvisoryCoordinator.bridgeAnalysisToAdvisory(
 *     actor, mentorId, analysisSignals
 *   );
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { getMentor } from "/systems/foundryvtt-swse/scripts/engine/mentor/mentor-json-loader.js";
import { BuildAnalysisEngine } from "/systems/foundryvtt-swse/scripts/engine/analysis/build-analysis-engine.js";
import { MentorJudgmentEngine } from "/systems/foundryvtt-swse/scripts/engine/mentor/mentor-judgment-engine.js";
import { MentorAdvisoryBridge } from "/systems/foundryvtt-swse/scripts/engine/analysis/mentor-advisory-bridge.js";

export class MentorAdvisoryCoordinator {
  /**
   * Load mentor advisory stub (hidden but complete infrastructure)
   *
   * @param {string} mentorId - Mentor ID (e.g., "miraj", "lead")
   * @returns {Promise<Object>} Advisory stub with profile and scaffolds, or null
   */
  static async loadAdvisoryStub(mentorId) {
    try {
      if (!mentorId) return null;

      // Advisory stubs are stored in data/dialogue/mentors/{mentorId}/{mentorId}_advisory_stub.json
      const response = await fetch(
        `/systems/foundryvtt-swse/data/dialogue/mentors/${mentorId}/${mentorId}_advisory_stub.json`
      );

      if (!response.ok) {
        SWSELogger.debug(`[MentorAdvisoryCoordinator] No advisory stub for mentor: ${mentorId}`);
        return null;
      }

      const stub = await response.json();
      SWSELogger.log(
        `[MentorAdvisoryCoordinator] Loaded advisory stub for ${mentorId}:`,
        { profile: stub.voice_profile, types: Object.keys(stub.advisory_types || {}) }
      );

      return stub;
    } catch (err) {
      SWSELogger.warn(`[MentorAdvisoryCoordinator] Failed to load advisory stub for ${mentorId}:`, err);
      return null;
    }
  }

  /**
   * Generate advisor for a specific advisory type and intensity
   *
   * @param {Actor} actor - The character
   * @param {string} mentorId - Mentor ID
   * @param {string} advisoryType - Type of advisory (e.g., 'conflict', 'drift')
   * @param {string} intensity - Intensity level (very_low, low, medium, high, very_high)
   * @param {Object} context - Additional context for the advisory
   * @returns {Promise<Object>} Generated advisory with mentor voice
   */
  static async generateAdvisory(actor, mentorId, advisoryType, intensity = 'medium', context = {}) {
    try {
      if (!actor || !mentorId || !advisoryType) {
        return null;
      }

      // Load advisory stub
      const stub = await this.loadAdvisoryStub(mentorId);
      if (!stub) {
        return null;
      }

      // Get advisory scaffold for this type and intensity
      const advisoryScaffold = stub.advisory_types?.[advisoryType]?.[intensity];
      if (!advisoryScaffold) {
        SWSELogger.warn(
          `[MentorAdvisoryCoordinator] No scaffold for advisory type: ${advisoryType}, intensity: ${intensity}`
        );
        return null;
      }

      // Load mentor for voice
      const mentor = await getMentor(mentorId);
      if (!mentor) {
        return null;
      }

      // Build advisory from scaffold
      const advisory = {
        mentor: mentorId,
        type: advisoryType,
        intensity,
        timestamp: Date.now(),
        observation: advisoryScaffold.observation || '',
        impact: advisoryScaffold.impact || '',
        guidance: advisoryScaffold.guidance || '',
        encouragement: advisoryScaffold.encouragement || null,
        voiceProfile: stub.voice_profile,
        context
      };

      SWSELogger.log(
        `[MentorAdvisoryCoordinator] Generated ${advisoryType} advisory (${intensity}) for ${mentor.name}`
      );

      return advisory;
    } catch (err) {
      SWSELogger.warn(
        `[MentorAdvisoryCoordinator] Failed to generate advisory: ${err.message}`
      );
      return null;
    }
  }

  /**
   * Bridge BuildAnalysisEngine signals to mentor advisory
   * Converts analysis output to advisor atoms and invokes appropriate advisory type
   *
   * @param {Actor} actor - The character
   * @param {string} mentorId - Mentor ID
   * @param {Object} analysisSignals - Signals from BuildAnalysisEngine.analyze()
   * @returns {Promise<Object>} Advisory with bridged atoms and mentor voice
   */
  static async bridgeAnalysisToAdvisory(actor, mentorId, analysisSignals) {
    try {
      if (!actor || !mentorId || !analysisSignals) {
        return null;
      }

      // Use MentorAdvisoryBridge to convert analysis to mentor input
      // (MentorAdvisoryBridge is designed but not yet integrated)
      if (typeof MentorAdvisoryBridge?.analysisToMentorInput === 'function') {
        const mentorInput = MentorAdvisoryBridge.analysisToMentorInput(analysisSignals);

        if (mentorInput && mentorInput.advisoryType) {
          return await this.generateAdvisory(
            actor,
            mentorId,
            mentorInput.advisoryType,
            mentorInput.intensity,
            { analysisSignals, atoms: mentorInput.atoms }
          );
        }
      }

      return null;
    } catch (err) {
      SWSELogger.warn(
        `[MentorAdvisoryCoordinator] Failed to bridge analysis to advisory: ${err.message}`
      );
      return null;
    }
  }

  /**
   * Get all available advisory types for a mentor
   * Used to surface what advisory modes are available
   *
   * @param {string} mentorId - Mentor ID
   * @returns {Promise<Array>} Array of advisory types available for this mentor
   */
  static async getAvailableAdvisoryTypes(mentorId) {
    try {
      const stub = await this.loadAdvisoryStub(mentorId);
      if (!stub || !stub.advisory_types) {
        return [];
      }

      return Object.keys(stub.advisory_types);
    } catch (err) {
      SWSELogger.warn(
        `[MentorAdvisoryCoordinator] Failed to get advisory types for ${mentorId}:`,
        err
      );
      return [];
    }
  }

  /**
   * Get voice profile for a mentor's advisory mode
   * Used for personalizing advisory delivery
   *
   * @param {string} mentorId - Mentor ID
   * @returns {Promise<string>} Voice profile (e.g., "kotor_droid_declarative")
   */
  static async getAdvisoryVoiceProfile(mentorId) {
    try {
      const stub = await this.loadAdvisoryStub(mentorId);
      return stub?.voice_profile || null;
    } catch (err) {
      SWSELogger.warn(
        `[MentorAdvisoryCoordinator] Failed to get voice profile for ${mentorId}:`,
        err
      );
      return null;
    }
  }

  /**
   * Check if mentor has complete advisory infrastructure
   *
   * @param {string} mentorId - Mentor ID
   * @returns {Promise<boolean>} True if mentor has advisory stubs
   */
  static async hasAdvisoryInfrastructure(mentorId) {
    const stub = await this.loadAdvisoryStub(mentorId);
    return !!stub;
  }

  /**
   * List all mentors with advisory infrastructure
   *
   * @returns {Promise<Array>} Array of mentor IDs with advisory stubs
   */
  static async listAdvisoryMentors() {
    try {
      // This requires iterating over known mentor list
      // For now, return array of mentors we know have stubs (from data structure)
      const knownMentors = [
        'miraj', 'lead', 'breach', 'kex_varon', 'jack', 'kyber', 'delta', 'mayu',
        'riquis', 'theron', 'rax', 'rogue', 'dezmin', 'olsalty', 'kharjo', 'korr',
        'pegar', 'krag', 'rajma', 'captain', 'seraphim', 'marl_skindar', 'sela',
        'j0_n1', 'axiom', 'whisper', 'zhen', 'vera', 'urza', 'darth_miedo',
        'darth_malbada', 'breach'
      ];

      const withAdvisory = [];
      for (const mentorId of knownMentors) {
        if (await this.hasAdvisoryInfrastructure(mentorId)) {
          withAdvisory.push(mentorId);
        }
      }

      return withAdvisory;
    } catch (err) {
      SWSELogger.warn(`[MentorAdvisoryCoordinator] Failed to list advisory mentors:`, err);
      return [];
    }
  }

  /**
   * Generate selection suggestion advisory — Phase 8 mentor integration
   * Takes suggestions from SuggestionService and formats them as mentor dialogue.
   *
   * Maps suggestion confidence to intensity level (low confidence = very_low intensity, etc.)
   * Uses strength_reinforcement template to frame suggestions positively.
   *
   * @param {Actor} actor - The character
   * @param {string} mentorId - Mentor ID
   * @param {Array} suggestions - Suggestion objects from SuggestionService
   * @param {Object} context - Additional context (domain, stepLabel, etc.)
   * @returns {Promise<Object>} Advisory object with mentor-voiced suggestion text
   */
  static async generateSuggestionAdvisory(actor, mentorId, suggestions, context = {}) {
    try {
      if (!actor || !mentorId || !suggestions || suggestions.length === 0) {
        return null;
      }

      // Load advisory stub
      const stub = await this.loadAdvisoryStub(mentorId);
      if (!stub) {
        SWSELogger.warn(`[MentorAdvisoryCoordinator] No advisory stub for mentor: ${mentorId}`);
        return null;
      }

      // Get the top suggestion
      const topSuggestion = suggestions[0];
      if (!topSuggestion) return null;

      // Map suggestion confidence to intensity (0.0-1.0 → very_low to very_high)
      const confidence = topSuggestion.suggestion?.confidence || 0.5;
      const intensityMap = {
        'very_low': 0.1,
        'low': 0.3,
        'medium': 0.5,
        'high': 0.7,
        'very_high': 0.9
      };

      let intensity = 'medium';
      for (const [level, threshold] of Object.entries(intensityMap)) {
        if (confidence >= threshold) {
          intensity = level;
        }
      }

      // Use strength_reinforcement advisory type (positive framing for suggestions)
      const advisoryScaffold = stub.advisory_types?.strength_reinforcement?.[intensity];
      if (!advisoryScaffold) {
        SWSELogger.warn(
          `[MentorAdvisoryCoordinator] No strength_reinforcement scaffold for intensity: ${intensity}`
        );
        return null;
      }

      // Load mentor for voice
      const mentor = await getMentor(mentorId);
      if (!mentor) {
        return null;
      }

      // Build suggestion context for template
      const suggestionName = topSuggestion.name || topSuggestion.id || 'this choice';
      const suggestionReason = topSuggestion.suggestion?.reason || 'it suits your path';
      const relatedGrowth = context.relatedGrowth || 'furthering your abilities';

      // Substitute template variables into scaffold
      let observation = advisoryScaffold.observation || '';
      let impact = advisoryScaffold.impact || '';
      let guidance = advisoryScaffold.guidance || '';

      observation = observation
        .replace('{strength_area}', suggestionName)
        .replace('{archetype_or_role}', context.archetype || 'your vision');

      impact = impact
        .replace('{strength_area}', suggestionName)
        .replace('{archetype_or_role}', context.archetype || 'your vision');

      guidance = guidance
        .replace('{related_growth_area}', relatedGrowth)
        .replace('{strength_area}', suggestionName);

      // Map confidence to mentor mood (higher confidence = more enthusiastic)
      let mentorMood = 'neutral';
      if (confidence >= 0.8) {
        mentorMood = 'encouraging'; // High confidence → enthusiastic
      } else if (confidence >= 0.6) {
        mentorMood = 'supportive'; // Medium-high confidence → supportive
      } else if (confidence >= 0.4) {
        mentorMood = 'thoughtful'; // Medium confidence → thoughtful consideration
      }

      // Build confidence label for display (1-5 stars or percentage)
      const confidencePercent = Math.round(confidence * 100);
      const confidenceLabel = `${confidencePercent}% confidence`;

      // Build advisory object
      const advisory = {
        mentor: mentorId,
        type: 'selection_suggestion',
        intensity,
        mood: mentorMood,
        timestamp: Date.now(),
        observation,
        impact,
        guidance,
        encouragement: advisoryScaffold['Optional Encouragement'] || null,
        voiceProfile: stub.voice_profile,
        context: {
          ...context,
          suggestion: topSuggestion,
          reason: suggestionReason,
          confidence,
          confidenceLabel,
          confidencePercent
        }
      };

      SWSELogger.log(
        `[MentorAdvisoryCoordinator] Generated selection suggestion advisory (${intensity}) for ${mentor.name}: ${suggestionName}`
      );

      return advisory;
    } catch (err) {
      SWSELogger.warn(
        `[MentorAdvisoryCoordinator] Failed to generate suggestion advisory: ${err.message}`
      );
      return null;
    }
  }
}

export default MentorAdvisoryCoordinator;
