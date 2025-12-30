/**
 * SWSE Mentor Suggestion Dialog
 *
 * Displays mentor-voiced suggestions during levelup with an "Apply Suggestion" button.
 * Styled to match the rest of the levelup UI.
 */

import { MentorSuggestionVoice } from './mentor-suggestion-voice.js';
import { MENTORS } from './mentor-dialogues.js';

export class MentorSuggestionDialog extends Dialog {
  /**
   * Show a mentor suggestion dialog
   * @param {string} mentorName - The mentor's name (key in MENTORS)
   * @param {Object} suggestion - The suggestion { name, tier, icon? }
   * @param {string} context - The context (feat_selection, talent_selection, etc.)
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} { applied: boolean, suggestion: Object } or null if dismissed
   */
  static async show(mentorName, suggestion, context, options = {}) {
    return new Promise((resolve) => {
      const mentor = MENTORS[mentorName];
      if (!mentor) {
        resolve(null);
        return;
      }

      // Use the mentor's character name (e.g., "Miraj") for voice generation
      // mentorName parameter is the class key (e.g., "Jedi")
      const mentorCharacterName = mentor.name;

      const voicedSuggestion = MentorSuggestionVoice.generateVoicedSuggestion(
        mentorCharacterName,
        suggestion,
        context
      );

      const content = this._buildDialogContent(mentor, voicedSuggestion);

      const dialog = new MentorSuggestionDialog(
        {
          title: `${mentorName}'s Suggestion`,
          content: content,
          buttons: {
            apply: {
              icon: '<i class="fas fa-check"></i>',
              label: "Apply Suggestion",
              callback: () => {
                resolve({
                  applied: true,
                  suggestion: suggestion
                });
              }
            },
            dismiss: {
              icon: '<i class="fas fa-times"></i>',
              label: "Dismiss",
              callback: () => {
                resolve({
                  applied: false,
                  suggestion: null
                });
              }
            }
          },
          default: "apply",
          render: (html) => {
            // Style the dialog
            html.find('.dialog-content').addClass('mentor-suggestion-dialog');
            html.find('button[data-button="apply"]').addClass('btn-success');
            html.find('button[data-button="dismiss"]').addClass('btn-secondary');
          },
          close: () => {
            resolve(null);
          }
        },
        options
      );

      dialog.render(true);
    });
  }

  /**
   * Build the HTML content for the suggestion dialog
   * @private
   * @param {Object} mentor - The mentor object from MENTORS
   * @param {Object} voicedSuggestion - The voiced suggestion from MentorSuggestionVoice
   * @returns {string} HTML content
   */
  static _buildDialogContent(mentor, voicedSuggestion) {
    const tierLabel = this._getTierLabel(voicedSuggestion.tier);

    return `
      <div class="mentor-suggestion-content">
        <div class="mentor-panel">
          <div class="mentor-portrait">
            <img src="${mentor.portrait}" alt="${mentor.name}" />
          </div>
          <div class="mentor-info">
            <h3>${mentor.name}</h3>
            <p class="mentor-title">${mentor.title}</p>
          </div>
        </div>

        <div class="suggestion-body">
          <p class="mentor-intro">${voicedSuggestion.introduction}</p>

          <div class="suggestion-card ${voicedSuggestion.tier ? `tier-${voicedSuggestion.tier}` : ''}">
            <div class="suggestion-header">
              ${voicedSuggestion.icon ? `<span class="tier-icon">${voicedSuggestion.icon}</span>` : ''}
              <span class="suggestion-name">${voicedSuggestion.suggestionName}</span>
              ${tierLabel ? `<span class="tier-label">${tierLabel}</span>` : ''}
            </div>
          </div>

          <p class="mentor-explanation">${voicedSuggestion.explanation}</p>
        </div>
      </div>
    `;
  }

  /**
   * Get the label for a suggestion tier
   * @private
   * @param {number} tier - The tier number (0-6)
   * @returns {string} The tier label or empty string
   */
  static _getTierLabel(tier) {
    const tierLabels = {
      0: "Fallback",
      1: "Class Synergy",
      2: "Ability Match",
      3: "Skill Match",
      4: "Chain Link",
      5: "Meta Synergy",
      6: "Prestige Prereq"
    };
    return tierLabels[tier] || "";
  }
}
