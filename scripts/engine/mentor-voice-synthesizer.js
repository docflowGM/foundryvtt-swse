/**
 * Mentor Voice Synthesizer
 *
 * Composes mentor voices from core voices using synthesis rules.
 * This is how non-core mentors get dialogue without custom writing.
 *
 * Algorithm:
 * 1. Get mentor synthesis config (primary/secondary voices + axis)
 * 2. Get topic response from primary voice
 * 3. Mix in emphasis from secondary voice (if present)
 * 4. Apply corruption axis DSP interpretation (if present)
 * 5. Return synthesized response
 */

import { MentorDialogueResponses } from './mentor-dialogue-responses.js';
import { MentorSynthesisConfig } from './mentor-synthesis-config.js';
import { SWSELogger } from '../utils/logger.js';

export class MentorVoiceSynthesizer {
  /**
   * Synthesize a mentor voice from core voices
   *
   * @param {string} mentorId - The mentor to synthesize
   * @param {string} topicKey - The dialogue topic
   * @param {Object} analysisData - Analysis data from suggestion engine
   * @returns {Object} Synthesized mentor response
   */
  static synthesizeVoice(mentorId, topicKey, analysisData = {}) {
    // If it's a core mentor, return directly without synthesis
    if (MentorSynthesisConfig.isCoreMentor(mentorId)) {
      return MentorDialogueResponses.getTopicResponse(mentorId, topicKey, analysisData);
    }

    // Get mentor synthesis config
    const config = MentorSynthesisConfig.getMentorConfig(mentorId);
    if (!config) {
      SWSELogger.warn(`No synthesis config found for mentor: ${mentorId}`);
      return MentorDialogueResponses.getTopicResponse("miraj", topicKey, analysisData);
    }

    // Get primary voice response (base truth)
    const primaryResponse = MentorDialogueResponses.getTopicResponse(
      config.primaryVoice,
      topicKey,
      analysisData
    );

    if (!config.secondaryVoice && !config.corruptionAxis) {
      // No synthesis needed, just return primary
      return primaryResponse;
    }

    // Build synthesized response
    const synthesized = { ...primaryResponse };

    // Mix in secondary voice emphasis if present
    if (config.secondaryVoice) {
      const secondaryResponse = MentorDialogueResponses.getTopicResponse(
        config.secondaryVoice,
        topicKey,
        analysisData
      );

      synthesized.emphasis = [
        ...primaryResponse.emphasis,
        ...secondaryResponse.emphasis
      ];
    }

    // Apply corruption axis DSP interpretation if present
    if (config.corruptionAxis) {
      synthesized.dspWarning = this._getAxisDspInterpreter(
        config.corruptionAxis
      )(analysisData.dspSaturation || 0, mentorId);
    }

    return synthesized;
  }

  /**
   * Get DSP interpreter for a corruption axis
   *
   * Corruption axes interpret DSP differently based on moral stance:
   * - Domination: DSP as proof of power
   * - Temptation: DSP as justification
   * - Exploitation: DSP as pragmatism
   * - Nihilism: DSP as irrelevance
   */
  static _getAxisDspInterpreter(axis) {
    const interpreters = {
      Domination: (dsp, mentorId) => {
        if (dsp > 0.5)
          return "⚠️ Your power grows undeniable. Hesitation fades with strength.";
        if (dsp > 0.2)
          return "The weakness of restraint diminishes. You see clearly.";
        return "";
      },

      Temptation: (dsp, mentorId) => {
        if (dsp > 0.5)
          return "⚠️ The path was necessary. They would have done the same.";
        if (dsp > 0.2)
          return "You're learning what survival really costs. That's wisdom.";
        return "";
      },

      Exploitation: (dsp, mentorId) => {
        if (dsp > 0.5)
          return "⚠️ You understand value now. Power respects those who know its price.";
        if (dsp > 0.2)
          return "Sentiment is a luxury. You're learning to optimize for profit.";
        return "";
      },

      Nihilism: (dsp, mentorId) => {
        if (dsp > 0.5)
          return "⚠️ Meaning dissolves. Only action remains.";
        if (dsp > 0.2)
          return "Purpose is a distraction. Efficiency is clarity.";
        return "";
      }
    };

    return interpreters[axis] || ((dsp, mentorId) => "");
  }

  /**
   * Get all mentors accessible to a player (core + non-core)
   *
   * @param {Actor} actor - The actor/character
   * @returns {Array} Array of mentor IDs the player can access
   */
  static getAccessibleMentors(actor) {
    const classItems = actor.items.filter(i => i.type === "class");
    const classNames = classItems.map(c => c.name);

    const allMentors = Object.keys(MentorSynthesisConfig.getAllMentors());
    const coreMentors = MentorSynthesisConfig.core;

    // For now, return all mentors (you can gate by class later if desired)
    // In the future, you might restrict by class:
    // return allMentors.filter(m => {
    //   const config = MentorSynthesisConfig.getMentorConfig(m);
    //   return config.unlockedBy && classNames.includes(config.unlockedBy);
    // });

    return allMentors;
  }

  /**
   * Check if mentor is accessible to player (always true for now)
   */
  static isMentorAccessible(actor, mentorId) {
    const accessible = this.getAccessibleMentors(actor);
    return accessible.includes(mentorId);
  }

  /**
   * Get mentor info for UI display
   */
  static getMentorInfo(mentorId) {
    const config = MentorSynthesisConfig.getMentorConfig(mentorId);
    if (!config) return null;

    const primaryConfig = MentorSynthesisConfig.getMentorConfig(
      config.primaryVoice
    );

    return {
      id: mentorId,
      title: config.title,
      description: config.description,
      isCore: MentorSynthesisConfig.isCoreMentor(mentorId),
      primaryVoice: config.primaryVoice,
      secondaryVoice: config.secondaryVoice || null,
      corruptionAxis: config.corruptionAxis || null,
      // You can expand this with more metadata as needed
    };
  }

  /**
   * Debug: Show how a mentor's voice will be synthesized
   */
  static debugSynthesis(mentorId, topicKey) {
    const config = MentorSynthesisConfig.getMentorConfig(mentorId);
    if (!config) return null;

    return {
      mentorId,
      title: config.title,
      topicKey,
      primaryVoice: config.primaryVoice,
      secondaryVoice: config.secondaryVoice,
      corruptionAxis: config.corruptionAxis,
      synthesis: `${config.primaryVoice} (primary) + ${config.secondaryVoice ? config.secondaryVoice + " (secondary)" : "none"} + ${config.corruptionAxis ? config.corruptionAxis + " axis" : "no axis"}`
    };
  }
}
