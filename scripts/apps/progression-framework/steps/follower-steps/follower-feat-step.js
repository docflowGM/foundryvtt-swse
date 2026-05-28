/**
 * FollowerFeatStep
 *
 * HEAVILY CONSTRAINED feat selection for followers.
 *
 * CONSTRAINT: Followers get ONLY:
 * - Weapon Proficiency (Simple Weapons) — all followers, always
 * - Template-specific bonus feats (from template definition)
 *
 * NO normal feat browser.
 * NO freeform feat selection.
 * Only legal follower feats shown.
 */

import { FollowerStepBase } from './follower-step-base.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { getFollowerTalentConfig } from '/systems/foundryvtt-swse/scripts/engine/crew/follower-talent-config.js';

export class FollowerFeatStep extends FollowerStepBase {
  constructor(descriptor) {
    super(descriptor);
    this._templateType = null;
    this._legalFeats = [];
    this._selectedFeats = [];
    this._grantedFeats = [];
    this._maxOptionalFeats = null;
  }

  async onStepEnter(shell) {
    try {
      const choices = this.getFollowerChoices(shell);
      this._templateType = choices.templateType;

      if (!this._templateType) {
        swseLogger.warn('[FollowerFeatStep] No template type selected yet');
        return;
      }

      const templates = await this.getFollowerTemplates();
      const template = templates[this._templateType] || {};
      const slotTalentName = shell?.progressionSession?.dependencyContext?.slotTalentName;
      const talentConfig = getFollowerTalentConfig(slotTalentName);

      this._grantedFeats = this._uniqueFeats([
        'Weapon Proficiency (Simple Weapons)',
        ...(template.feats || []),
        ...(talentConfig?.additionalFeats || [])
      ]);

      // Load legal optional feats for this template, then add granting-talent armor picks.
      const legalFeats = await this.getFollowerFeatsForTemplate(this._templateType);
      const armorChoices = talentConfig?.armorProficiencyChoice
        ? ['Armor Proficiency (Light)', 'Armor Proficiency (Medium)', 'Armor Proficiency (Heavy)']
        : [];
      this._legalFeats = this._uniqueFeats([...legalFeats, ...armorChoices])
        .filter(feat => !this._grantedFeats.includes(feat));

      const templateChoiceSlots = Array.isArray(template.featChoices) && template.featChoices.length > 0 ? 1 : 0;
      const armorChoiceSlots = talentConfig?.armorProficiencyChoice ? 1 : 0;
      this._maxOptionalFeats = templateChoiceSlots + armorChoiceSlots || null;

      swseLogger.log('[FollowerFeatStep] Entered, template:', this._templateType, 'granted feats:', this._grantedFeats, 'legal feats:', this._legalFeats);

      // Restore selection from session if available
      if (choices.featChoices && choices.featChoices.length > 0) {
        this._selectedFeats = this._uniqueFeats(choices.featChoices).filter(feat => this._legalFeats.includes(feat));
      }
    } catch (err) {
      swseLogger.error('[FollowerFeatStep] Error entering step:', err);
    }
  }

  async onRender(shell, html, context) {
    try {
      const container = html.querySelector('[data-step-content]');
      if (!container) {
        swseLogger.warn('[FollowerFeatStep] No step content container found');
        return;
      }

      const contentHtml = this._renderFeatSelection();
      container.innerHTML = contentHtml;

      // Attach event listeners
      if (this._legalFeats.length > 0) {
        this._attachFeatListeners(shell, container);
      }
    } catch (err) {
      swseLogger.error('[FollowerFeatStep] Error rendering:', err);
    }
  }

  _renderFeatSelection() {
    const grantedHtml = (this._grantedFeats.length ? this._grantedFeats : ['Weapon Proficiency (Simple Weapons)'])
      .map(feat => `
        <div class="follower-feat-item granted">
          <span class="feat-name">${feat}</span>
          <span class="feat-badge">Granted</span>
        </div>
      `).join('');

    // Template-specific feats (optional)
    const optionalHtml = (this._legalFeats || []).map(feat => {
      const isSelected = this._selectedFeats.includes(feat);
      return `
        <div class="follower-feat-item ${isSelected ? 'selected' : ''}" data-feat="${feat}">
          <input type="checkbox" class="feat-checkbox" data-feat="${feat}" ${isSelected ? 'checked' : ''}>
          <label class="feat-label">${feat}</label>
        </div>
      `;
    }).join('');

    const titleCase = this._templateType.charAt(0).toUpperCase() + this._templateType.slice(1);

    return `
      <div class="follower-step-content">
        <h3>${titleCase} Follower Feats</h3>
        <p class="step-help">All followers gain their base/template/granting-talent feats automatically. Select only the optional feat choices below.</p>

        <h4>Granted Feats</h4>
        <div class="follower-feats-granted">
          ${grantedHtml}
        </div>

        ${this._legalFeats.length > 0 ? `
          <h4>Optional Feats</h4>
          <div class="follower-feats-optional">
            ${optionalHtml}
          </div>
        ` : ''}
      </div>
    `;
  }

  _attachFeatListeners(shell, container) {
    const checkboxes = container.querySelectorAll('.feat-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const feat = checkbox.getAttribute('data-feat');
        const isChecked = checkbox.checked;

        if (isChecked) {
          if (this._maxOptionalFeats && this._selectedFeats.length >= this._maxOptionalFeats && !this._selectedFeats.includes(feat)) {
            checkbox.checked = false;
            ui?.notifications?.warn?.(`This follower can select ${this._maxOptionalFeats} optional feat${this._maxOptionalFeats === 1 ? '' : 's'} from this step.`);
            return;
          }
          if (!this._selectedFeats.includes(feat)) {
            this._selectedFeats.push(feat);
          }
        } else {
          this._selectedFeats = this._selectedFeats.filter(f => f !== feat);
        }

        swseLogger.log('[FollowerFeatStep] Selected feats:', this._selectedFeats);
      });
    });
  }

  _uniqueFeats(feats) {
    return Array.from(new Set((feats || []).filter(Boolean).map(feat => String(feat).trim()).filter(Boolean)));
  }

  async onStepCommit(shell) {
    this.saveFollowerChoice(shell, 'featChoices', this._selectedFeats);
    swseLogger.log('[FollowerFeatStep] Committed feats:', this._selectedFeats);
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
