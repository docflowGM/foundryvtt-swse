/**
 * Mentor Voice Filter v2 — Topic-Based System
 *
 * New architecture that wraps canonical analysis from the suggestion engine
 * with authentic mentor voices.
 *
 * This replaces the old filter-per-topic approach with a clean system:
 * 1. Suggestion engine produces canonical analysis
 * 2. Mentor voice wrapper adds opening, closing, emphasis
 * 3. DSP interpreter adds contextual warnings
 *
 * Much simpler, much more scalable.
 */

import { MentorDialogueResponses } from './mentor-dialogue-responses.js';
import { SWSELogger } from '../utils/logger.js';

export class MentorVoiceFilterV2 {
  /**
   * Apply mentor voice to a topic response
   *
   * @param {string} mentorName - The mentor's name
   * @param {string} topicKey - The dialogue topic key
   * @param {Object} analysisData - Data from suggestion engine
   * @returns {string} Fully voiced response ready for display
   */
  static applyVoice(mentorName, topicKey, analysisData = {}) {
    const response = MentorDialogueResponses.getTopicResponse(mentorName, topicKey, analysisData);

    let voicedResponse = '';

    // Opening wrapper
    if (response.opening) {
      voicedResponse += response.opening + '\n\n';
    }

    // Canonical analysis
    if (response.analysis) {
      voicedResponse += response.analysis + '\n\n';
    }

    // DSP warning (if applicable)
    if (response.dspWarning) {
      voicedResponse += response.dspWarning + '\n\n';
    }

    // Closing wrapper
    if (response.closing) {
      voicedResponse += response.closing;
    }

    return voicedResponse.trim();
  }

  /**
   * Get just the mentor's opening for a topic (useful for quick previews)
   */
  static getOpening(mentorName, topicKey, analysisData = {}) {
    const response = MentorDialogueResponses.getTopicResponse(mentorName, topicKey, analysisData);
    return response.opening || 'Let me share my thoughts.';
  }

  /**
   * Get just the mentor's closing (useful for summary)
   */
  static getClosing(mentorName, topicKey, analysisData = {}) {
    const response = MentorDialogueResponses.getTopicResponse(mentorName, topicKey, analysisData);
    return response.closing || 'Consider your path carefully.';
  }

  /**
   * Check if mentor has coverage for this topic
   */
  static hasCoverage(mentorName, topicKey) {
    const responses = MentorDialogueResponses.TOPIC_RESPONSES[topicKey];
    if (!responses) {return false;}

    const sanitized = mentorName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return !!responses.mentors[sanitized];
  }

  /**
   * Get list of all topics with mentor coverage
   */
  static getCoveredTopics(mentorName) {
    const covered = [];
    for (const topicKey of Object.keys(MentorDialogueResponses.TOPIC_RESPONSES)) {
      if (this.hasCoverage(mentorName, topicKey)) {
        covered.push(topicKey);
      }
    }
    return covered;
  }
}
