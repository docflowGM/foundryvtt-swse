/**
 * Mentor Dialogue v2 Integration
 *
 * Bridges the suggestion engine analysis with mentor voice wrapping.
 * Used by MentorChatDialog to apply voices to generated analysis.
 *
 * This handles the 8 dialogue topics system:
 * - Who am I becoming?
 * - What paths are open?
 * - What am I doing well?
 * - What am I doing wrong?
 * - How should I fight?
 * - What should I be careful of?
 * - What lies ahead?
 * - How would you play this?
 */

import { MentorVoiceFilterV2 } from './mentor-voice-filter-v2.js';
import { SWSELogger } from '../utils/logger.js';

export class MentorDialogueV2Integration {
  /**
   * Wrap an analysis response with mentor voice
   *
   * @param {string} mentorName - The mentor's name
   * @param {string} topicKey - The dialogue topic (e.g., "who_am_i_becoming")
   * @param {string} canonicalAnalysis - The raw analysis from suggestion engine
   * @param {Object} analysisData - Additional context data for voice variations
   * @returns {Object} { introduction, advice, emphasis }
   */
  static wrapAnalysisWithVoice(mentorName, topicKey, canonicalAnalysis, analysisData = {}) {
    try {
      // Get mentor voice response
      const voicedResponse = MentorVoiceFilterV2.applyVoice(
        mentorName,
        topicKey,
        {
          ...analysisData,
          // Ensure we have canonical analysis in the data
          analysis: canonicalAnalysis
        }
      );

      return {
        introduction: MentorVoiceFilterV2.getOpening(mentorName, topicKey, analysisData),
        advice: voicedResponse,
        emphasis: analysisData.emphasis || []
      };
    } catch (err) {
      SWSELogger.error(`Error wrapping dialogue for ${mentorName} on topic ${topicKey}:`, err);
      return {
        introduction: "I apologize, but I'm having trouble forming my thoughts right now.",
        advice: canonicalAnalysis,
        emphasis: []
      };
    }
  }

  /**
   * Build analysis data object for voice system from actor data
   */
  static buildAnalysisData(actor, buildIntent, topic) {
    const level = actor.system.level || 1;
    const abilities = actor.system.abilities || {};
    const dsp = actor.system.darkSidePoints?.value || 0;
    const dspMax = actor.system.darkSidePoints?.max || 10;
    const dspSaturation = dspMax > 0 ? dsp / dspMax : 0;

    const baseData = {
      level,
      dspSaturation,
      dsp,
      dspMax,
      inferredRole: buildIntent?.inferredRole || 'adventurer',
      primaryThemes: buildIntent?.primaryThemes || [],
      combatStyle: buildIntent?.combatStyle || 'mixed',
      abilities
    };

    // Topic-specific data
    switch (topic) {
      case 'who_am_i_becoming':
        return {
          ...baseData,
          primaryThemes: buildIntent?.primaryThemes || []
        };

      case 'paths_open':
        return {
          ...baseData,
          mentorClass: buildIntent?.mentorClass
        };

      case 'doing_well':
        return {
          ...baseData,
          strengths: buildIntent?.strengths || [],
          prestigeAffinities: buildIntent?.prestigeAffinities || []
        };

      case 'doing_wrong':
        return {
          ...baseData,
          gaps: buildIntent?.gaps || []
        };

      case 'how_should_i_fight':
        return {
          ...baseData,
          combatStyle: buildIntent?.combatStyle || 'mixed'
        };

      case 'be_careful':
        return {
          ...baseData,
          risks: buildIntent?.risks || [],
          combatStyle: buildIntent?.combatStyle || 'mixed'
        };

      case 'what_lies_ahead':
        return {
          ...baseData,
          targetClass: buildIntent?.targetPrestigeClass,
          targetConfidence: buildIntent?.prestigeConfidence,
          prestigeAffinities: buildIntent?.prestigeAffinities || []
        };

      case 'how_would_you_play':
        return baseData;

      default:
        return baseData;
    }
  }

  /**
   * Check if a mentor has full coverage for this topic
   */
  static hasMentorCoverage(mentorName, topicKey) {
    return MentorVoiceFilterV2.hasCoverage(mentorName, topicKey);
  }

  /**
   * Get list of topics a mentor can discuss
   */
  static getTopicsForMentor(mentorName) {
    return MentorVoiceFilterV2.getCoveredTopics(mentorName);
  }
}
