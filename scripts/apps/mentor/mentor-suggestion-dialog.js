/**
 * SWSE Mentor Suggestion Dialog
 *
 * Displays mentor-voiced suggestions during levelup with an "Apply Suggestion" button.
 * Styled to match the rest of the levelup UI.
 * Features typing animation for mentor text for immersion.
 */

import { MentorSuggestionVoice } from '../../mentor/mentor-suggestion-voice.js';
import { MENTORS } from './mentor-dialogues.js';
import { TypingAnimation } from '../../utils/typing-animation.js';

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
              label: 'Apply Suggestion',
              callback: () => {
                resolve({
                  applied: true,
                  suggestion: suggestion
                });
              }
            },
            dismiss: {
              icon: '<i class="fas fa-times"></i>',
              label: 'Dismiss',
              callback: () => {
                resolve({
                  applied: false,
                  suggestion: null
                });
              }
            }
          },
          default: 'apply',
          render: (html) => {
            const root = html instanceof HTMLElement ? html : html?.[0];
            root?.querySelector?.('.dialog-content')?.classList?.add('mentor-suggestion-dialog');
            root?.querySelector?.('button[data-button="apply"]')?.classList?.add('btn-success');
            root?.querySelector?.('button[data-button="dismiss"]')?.classList?.add('btn-secondary');

            const introElement = root?.querySelector?.('.mentor-intro');
            const explanationElement = root.querySelector('.mentor-explanation')[0];

            if (introElement && explanationElement) {
              const introText = voicedSuggestion.introduction;
              const explanationText = voicedSuggestion.explanation;

              TypingAnimation.typeText(introElement, introText, {
                speed: 50,
                skipOnClick: true,
                onComplete: () => {
                  TypingAnimation.typeText(explanationElement, explanationText, {
                    speed: 45,
                    skipOnClick: true
                  });
                }
              });
            }
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
      0: 'Fallback',
      1: 'Class Synergy',
      2: 'Ability Match',
      3: 'Skill Match',
      4: 'Chain Link',
      5: 'Meta Synergy',
      6: 'Prestige Prereq'
    };
    return tierLabels[tier] || '';
  }
}
