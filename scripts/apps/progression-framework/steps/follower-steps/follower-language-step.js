/**
 * FollowerLanguageStep
 *
 * Followers know species languages + Basic, then choose one language known by
 * the controlling owner plus normal positive-INT bonus language picks. Minions
 * and nonheroics use their own normal language handling outside this follower
 * flow.
 */

import { FollowerStepBase } from './follower-step-base.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class FollowerLanguageStep extends FollowerStepBase {
  constructor(descriptor) {
    super(descriptor);
    this._speciesName = null;
    this._forcedLanguages = [];
    this._ownerLanguages = [];
    this._allLanguages = [];
    this._selectedLanguages = [];
    this._pickCount = 1;
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

      const langData = await this.getFollowerLanguages(ownerActor, this._speciesName, choices);
      this._forcedLanguages = langData.forced || ['Basic'];
      this._ownerLanguages = langData.ownerLanguages || [];
      this._allLanguages = langData.allLanguages || [];
      this._pickCount = Math.max(0, Number(langData.pickCount || 0));

      const forcedSet = new Set(this._forcedLanguages);
      const restored = Array.isArray(choices.languageChoices) ? choices.languageChoices : [];
      this._selectedLanguages = restored.filter(lang => !forcedSet.has(lang));
      this._selectedLanguages = this._selectedLanguages.filter(lang => this._allLanguages.includes(lang) || this._ownerLanguages.includes(lang));
      this._selectedLanguages = this._selectedLanguages.slice(0, this._pickCount);

      swseLogger.log('[FollowerLanguageStep] Entered', {
        forced: this._forcedLanguages,
        owner: this._ownerLanguages,
        pickCount: this._pickCount,
        selected: this._selectedLanguages
      });
    } catch (err) {
      swseLogger.error('[FollowerLanguageStep] Error entering step:', err);
    }
  }

  async onRender(shell, html, context) {
    try {
      const container = html.querySelector('[data-step-content]');
      if (!container) return;
      container.innerHTML = this._renderLanguageSelection();
      this._attachLanguageListeners(shell, container);
    } catch (err) {
      swseLogger.error('[FollowerLanguageStep] Error rendering:', err);
    }
  }

  _renderLanguageSelection() {
    const forcedHtml = this._forcedLanguages.map(lang => `
      <div class="follower-language-item native">
        <span class="language-name">${lang}</span>
        <span class="language-badge">Forced</span>
      </div>
    `).join('');

    const selectedCount = this._selectedLanguages.length;
    const remaining = Math.max(0, this._pickCount - selectedCount);
    const ownerSelected = this._selectedLanguages.some(lang => this._ownerLanguages.includes(lang));

    const ownerHtml = this._ownerLanguages.map(lang => this._renderLanguageCheckbox(lang, 'owner')).join('');
    const otherHtml = this._allLanguages
      .filter(lang => !this._ownerLanguages.includes(lang))
      .map(lang => this._renderLanguageCheckbox(lang, 'bonus'))
      .join('');

    return `
      <div class="follower-step-content">
        <h3>Follower Languages</h3>
        <p class="step-help">Followers know their species languages and Basic. They also choose one language known by the controlling owner, plus normal positive-INT bonus language picks.</p>

        <h4>Forced Languages</h4>
        <div class="follower-languages-native">${forcedHtml}</div>

        <div class="language-pick-summary">
          <p><strong>Language picks:</strong> ${selectedCount} / ${this._pickCount} selected (${remaining} remaining)</p>
          ${this._pickCount > 0 && this._ownerLanguages.length > 0 && !ownerSelected ? '<p class="warning">At least one selected language must be known by the owner.</p>' : ''}
        </div>

        ${this._pickCount > 0 ? `
          <h4>Owner Known Languages</h4>
          ${this._ownerLanguages.length ? `<div class="follower-languages-shared">${ownerHtml}</div>` : '<p class="step-help">The owner has no additional language records to choose from.</p>'}

          <h4>Other Bonus Language Options</h4>
          <div class="follower-languages-shared">${otherHtml}</div>
        ` : '<p class="step-help">This follower has no bonus language picks.</p>'}
      </div>
    `;
  }

  _renderLanguageCheckbox(lang, source) {
    const isSelected = this._selectedLanguages.includes(lang);
    return `
      <div class="follower-language-item ${isSelected ? 'selected' : ''}" data-language="${lang}">
        <input type="checkbox" class="language-checkbox" data-language="${lang}" data-source="${source}" ${isSelected ? 'checked' : ''}>
        <label class="language-label">${lang}</label>
        ${source === 'owner' ? '<span class="language-badge">Owner</span>' : ''}
      </div>
    `;
  }

  _attachLanguageListeners(shell, container) {
    container.querySelectorAll('.language-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        const language = checkbox.getAttribute('data-language');
        const isChecked = checkbox.checked;

        if (isChecked) {
          if (this._selectedLanguages.length >= this._pickCount) {
            checkbox.checked = false;
            ui?.notifications?.warn?.(`You may select only ${this._pickCount} bonus language${this._pickCount === 1 ? '' : 's'}.`);
            return;
          }
          if (!this._selectedLanguages.includes(language)) this._selectedLanguages.push(language);
        } else {
          this._selectedLanguages = this._selectedLanguages.filter(lang => lang !== language);
        }

        this.saveFollowerChoice(shell, 'languageChoices', this._allChosenLanguages());
        shell.render();
      });
    });
  }

  async onStepCommit(shell) {
    if (this._selectedLanguages.length < this._pickCount) {
      ui?.notifications?.warn?.(`Choose ${this._pickCount} bonus language${this._pickCount === 1 ? '' : 's'} for this follower.`);
      return false;
    }

    if (this._pickCount > 0 && this._ownerLanguages.length > 0) {
      const ownerSelected = this._selectedLanguages.some(lang => this._ownerLanguages.includes(lang));
      if (!ownerSelected) {
        ui?.notifications?.warn?.('Choose at least one language known by the controlling owner.');
        return false;
      }
    }

    this.saveFollowerChoice(shell, 'languageChoices', this._allChosenLanguages());
    return true;
  }

  _allChosenLanguages() {
    return this._uniqueStrings([...this._forcedLanguages, ...this._selectedLanguages]);
  }

  getUtilityBarConfig() {
    return { showSearch: false, showSort: false, showFilter: false };
  }
}
