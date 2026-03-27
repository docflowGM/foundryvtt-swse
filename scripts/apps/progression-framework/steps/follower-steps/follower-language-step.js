/**
 * FollowerLanguageStep
 *
 * Language selection for followers with strict constraints.
 *
 * CONSTRAINT: Followers speak:
 * - Their native language (from species)
 * - Any languages shared with their owner
 *
 * NO freeform language selection.
 * Native language is forced (always known).
 * Owner-shared languages are optional bonus languages.
 */

import { FollowerStepBase } from './follower-step-base.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class FollowerLanguageStep extends FollowerStepBase {
  constructor(descriptor) {
    super(descriptor);
    this._speciesName = null;
    this._nativeLanguage = null;
    this._ownerLanguages = [];
    this._selectedLanguages = [];
  }

  async onStepEnter(shell) {
    try {
      const choices = this.getFollowerChoices(shell);
      const ownerActor = this.getOwnerActor(shell);

      this._speciesName = choices.speciesName;

      if (!this._speciesName || !ownerActor) {
        swseLogger.warn('[FollowerLanguageStep] Missing species or owner');
        return;
      }

      // Get native language and owner languages
      const langData = await this.getFollowerLanguages(ownerActor, this._speciesName);
      this._nativeLanguage = langData.native;
      this._ownerLanguages = langData.available;

      swseLogger.log('[FollowerLanguageStep] Entered, native:', this._nativeLanguage, 'owner languages:', this._ownerLanguages);

      // Native language is always selected
      this._selectedLanguages = [this._nativeLanguage];

      // Restore additional language selections from session
      if (choices.languageChoices && choices.languageChoices.length > 0) {
        // Preserve any owner-shared languages that were selected
        const ownerShared = choices.languageChoices.filter(lang => this._ownerLanguages.includes(lang));
        this._selectedLanguages = [this._nativeLanguage, ...ownerShared];
      }
    } catch (err) {
      swseLogger.error('[FollowerLanguageStep] Error entering step:', err);
    }
  }

  async onRender(shell, html, context) {
    try {
      const container = html.querySelector('[data-step-content]');
      if (!container) {
        swseLogger.warn('[FollowerLanguageStep] No step content container found');
        return;
      }

      const contentHtml = this._renderLanguageSelection();
      container.innerHTML = contentHtml;

      // Attach event listeners
      this._attachLanguageListeners(shell, container);
    } catch (err) {
      swseLogger.error('[FollowerLanguageStep] Error rendering:', err);
    }
  }

  _renderLanguageSelection() {
    // Native language is forced (always known)
    const nativeHtml = `
      <div class="follower-language-item native">
        <span class="language-name">${this._nativeLanguage}</span>
        <span class="language-badge">Native</span>
      </div>
    `;

    // Owner-shared languages are optional
    const ownerLangHtml = (this._ownerLanguages || []).map(lang => {
      const isSelected = this._selectedLanguages.includes(lang);
      return `
        <div class="follower-language-item ${isSelected ? 'selected' : ''}" data-language="${lang}">
          <input type="checkbox" class="language-checkbox" data-language="${lang}" ${isSelected ? 'checked' : ''}>
          <label class="language-label">${lang}</label>
        </div>
      `;
    }).join('');

    return `
      <div class="follower-step-content">
        <h3>Follower Languages</h3>
        <p class="step-help">Followers always know their native language. They may also learn languages shared with their owner.</p>

        <h4>Native Language</h4>
        <div class="follower-languages-native">
          ${nativeHtml}
        </div>

        ${this._ownerLanguages.length > 0 ? `
          <h4>Owner-Shared Languages (Optional)</h4>
          <div class="follower-languages-shared">
            ${ownerLangHtml}
          </div>
        ` : `
          <p class="step-help">The owner speaks no additional languages shared with the follower.</p>
        `}
      </div>
    `;
  }

  _attachLanguageListeners(shell, container) {
    const checkboxes = container.querySelectorAll('.language-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const language = checkbox.getAttribute('data-language');
        const isChecked = checkbox.checked;

        if (isChecked) {
          if (!this._selectedLanguages.includes(language)) {
            this._selectedLanguages.push(language);
          }
        } else {
          // Can only uncheck owner-shared languages (not native)
          if (language !== this._nativeLanguage) {
            this._selectedLanguages = this._selectedLanguages.filter(l => l !== language);
          } else {
            // Re-check native language (can't uncheck)
            checkbox.checked = true;
          }
        }

        swseLogger.log('[FollowerLanguageStep] Selected languages:', this._selectedLanguages);
      });
    });
  }

  async onStepCommit(shell) {
    // Always include native language
    if (!this._selectedLanguages.includes(this._nativeLanguage)) {
      this._selectedLanguages = [this._nativeLanguage, ...this._selectedLanguages];
    }

    this.saveFollowerChoice(shell, 'languageChoices', this._selectedLanguages);
    swseLogger.log('[FollowerLanguageStep] Committed languages:', this._selectedLanguages);
    return true;
  }

  getUtilityBarConfig() {
    return {
      showSearch: false,
      showSort: false,
      showFilter: false,
    };
  }
}
