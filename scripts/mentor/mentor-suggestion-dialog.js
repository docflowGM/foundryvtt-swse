/**
 * SWSE Mentor Suggestion Dialog
 *
 * Displays mentor-voiced suggestions during levelup with an "Apply Suggestion" button.
 * Styled to match the rest of the levelup UI.
 * Features typing animation for mentor text for immersion.
 * AppV2-based implementation
 */

import { MentorSuggestionVoice } from "/systems/foundryvtt-swse/scripts/mentor/mentor-suggestion-voice.js";
import { MENTORS } from "/systems/foundryvtt-swse/scripts/engine/mentor/mentor-dialogues.js";
import { MentorTranslationIntegration } from "/systems/foundryvtt-swse/scripts/mentor/mentor-translation-integration.js";

export class MentorSuggestionDialog extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: 'mentor-suggestion-dialog',
    tag: 'div',
    window: { icon: 'fa-solid fa-lightbulb', title: 'Mentor Suggestion' },
    position: { width: 550, height: 'auto' }
  };

  constructor(mentor, voicedSuggestion, suggestion, options = {}) {
    super(options);
    this.mentor = mentor;
    this.voicedSuggestion = voicedSuggestion;
    this.suggestion = suggestion;
    this.resolveDialog = null;
  }

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

      const dialog = new MentorSuggestionDialog(mentor, voicedSuggestion, suggestion, {
        window: { title: `${mentorName}'s Suggestion` },
        ...options
      });

      dialog.resolveDialog = resolve;

      // Handle close without button press
      const origClose = dialog.close.bind(dialog);
      dialog.close = function() {
        if (dialog.resolveDialog) {
          dialog.resolveDialog(null);
          dialog.resolveDialog = null;
        }
        return origClose();
      };

      dialog.render(true);
    });
  }

  _renderHTML(context, options) {
    const tierLabel = this._getTierLabel(this.voicedSuggestion.tier);

    return `
      <div class="mentor-suggestion-content">
        <div class="mentor-panel">
          <div class="mentor-portrait">
            <img src="${this.mentor.portrait}" alt="${this.mentor.name}" />
          </div>
          <div class="mentor-info">
            <h3>${this.mentor.name}</h3>
            <p class="mentor-title">${this.mentor.title}</p>
          </div>
        </div>

        <div class="suggestion-body">
          <p class="mentor-intro"></p>

          <div class="suggestion-card ${this.voicedSuggestion.tier ? `tier-${this.voicedSuggestion.tier}` : ''}">
            <div class="suggestion-header">
              ${this.voicedSuggestion.icon ? `<span class="tier-icon">${this.voicedSuggestion.icon}</span>` : ''}
              <span class="suggestion-name">${this.voicedSuggestion.suggestionName}</span>
              ${tierLabel ? `<span class="tier-label">${tierLabel}</span>` : ''}
            </div>
          </div>

          <p class="mentor-explanation"></p>
        </div>

        <div class="mentor-buttons">
          <button class="btn btn-success" data-action="apply">
            <i class="fa-solid fa-check"></i> Apply Suggestion
          </button>
          <button class="btn btn-secondary" data-action="dismiss">
            <i class="fa-solid fa-times"></i> Dismiss
          </button>
        </div>
      </div>
    `;
  }

  _replaceHTML(result, content, options) {
    result.innerHTML = '';
    result.appendChild(content);
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this.activateListeners();
    this.startTypingAnimation();
  }

  activateListeners() {
    this.element?.querySelector('[data-action="apply"]')?.addEventListener('click', () => {
      if (this.resolveDialog) {
        this.resolveDialog({
          applied: true,
          suggestion: this.suggestion
        });
        this.resolveDialog = null;
      }
      this.close();
    });

    this.element?.querySelector('[data-action="dismiss"]')?.addEventListener('click', () => {
      if (this.resolveDialog) {
        this.resolveDialog({
          applied: false,
          suggestion: null
        });
        this.resolveDialog = null;
      }
      this.close();
    });
  }

  /**
   * Start typing animation for mentor text
   */
  startTypingAnimation() {
    const introElement = this.element?.querySelector('.mentor-intro');
    const explanationElement = this.element?.querySelector('.mentor-explanation');
    if (!introElement || !explanationElement) { return; }
    const introText = this.voicedSuggestion.introduction;
    const explanationText = this.voicedSuggestion.explanation;
    const mentorKey = MentorTranslationIntegration.normalizeMentorKey(this.mentorName || this.currentMentorClass || 'default');
    MentorTranslationIntegration.render({ text: introText, container: introElement, mentor: mentorKey, topic: 'mentor_intro', force: true, onComplete: () => {
      MentorTranslationIntegration.render({ text: explanationText, container: explanationElement, mentor: mentorKey, topic: 'mentor_explanation', force: true });
    }});
  }

  /**
   * Get the label for a suggestion tier
   * @private
   * @param {number} tier - The tier number (0-6)
   * @returns {string} The tier label or empty string
   */
  _getTierLabel(tier) {
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
