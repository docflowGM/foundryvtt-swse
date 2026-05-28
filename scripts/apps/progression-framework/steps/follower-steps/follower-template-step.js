/**
 * FollowerTemplateStep
 *
 * Selects the follower template type. Organic followers choose which of the two
 * template ability bonuses applies here. Droid followers use their chassis +2
 * from the identity/chassis step and do not receive an organic template ability
 * choice.
 */

import { FollowerStepBase } from './follower-step-base.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class FollowerTemplateStep extends FollowerStepBase {
  constructor(descriptor) {
    super(descriptor);
    this._templates = {};
    this._selectedTemplate = null;
    this._abilityChoice = null;
    this._isDroid = false;
  }

  async onStepEnter(shell) {
    try {
      this._templates = await this.getFollowerTemplates();
      const choices = this.getFollowerChoices(shell);
      this._selectedTemplate = choices.templateType || null;
      this._abilityChoice = choices.abilityChoice || this.getDefaultTemplateAbility(this._selectedTemplate);
      this._isDroid = this.isDroidFollowerChoice(choices);
      swseLogger.log('[FollowerTemplateStep] Entered, available templates:', Object.keys(this._templates));
    } catch (err) {
      swseLogger.error('[FollowerTemplateStep] Error entering step:', err);
      ui?.notifications?.error?.('Failed to load templates. Please reload.');
    }
  }

  async onRender(shell, html) {
    const container = html.querySelector('[data-step-content]');
    if (!container) return;
    container.innerHTML = this._renderTemplateCards();
    this._attachTemplateListeners(shell, container);
  }

  _renderTemplateCards() {
    const cardHtml = Object.entries(this._templates || {}).map(([templateKey, template]) => {
      const isSelected = this._selectedTemplate === templateKey;
      const titleCase = templateKey.charAt(0).toUpperCase() + templateKey.slice(1);
      const abilityOptions = this.getTemplateAbilityOptions(templateKey);
      const abilityHtml = this._isDroid ? '<li>Droid ability bonus comes from chassis selection</li>' : `
        <li>Choose +${template.abilityBonus || 2} to one: ${abilityOptions.map(key => key.toUpperCase()).join(' or ')}</li>
      `;

      return `
        <div class="follower-template-card ${isSelected ? 'selected' : ''}" data-template="${templateKey}">
          <div class="template-card-header"><h3>${titleCase}</h3></div>
          <div class="template-card-body">
            <div class="template-description"><p>${template.description || 'Follower template'}</p></div>
            <div class="template-benefits">
              <h4>Benefits</h4>
              <ul>
                ${abilityHtml}
                ${template.defenseBonus ? `<li>Defense bonuses: ${this._formatDefenseBonus(template.defenseBonus)}</li>` : ''}
                ${template.skillFocus ? `<li>Skill focus: ${template.skillFocus}</li>` : ''}
              </ul>
            </div>
            ${isSelected && !this._isDroid ? this._renderAbilityChoice(templateKey, template) : ''}
            <div class="template-constraints">
              <h4>Follower Rules</h4>
              <ul>
                ${templateKey === 'aggressive' ? '<li>Skills: Endurance</li>' : ''}
                ${templateKey === 'defensive' ? '<li>Skills: Endurance</li>' : ''}
                ${templateKey === 'utility' ? '<li>Skills: choose one trained skill except Use the Force</li>' : ''}
                <li>Future level-ups are automatic recalculations, not choice flows</li>
              </ul>
            </div>
          </div>
          <button type="button" class="select-template-btn" data-template="${templateKey}">
            ${isSelected ? '✓ Selected' : 'Select'}
          </button>
        </div>
      `;
    }).join('');

    return `
      <div class="follower-step-content">
        <h3>Select Follower Template</h3>
        <p class="step-help">The template controls BAB, defenses, skills, and the organic follower ability bonus.</p>
        <div class="follower-template-grid">${cardHtml}</div>
      </div>
    `;
  }

  _renderAbilityChoice(templateKey, template) {
    const options = this.getTemplateAbilityOptions(templateKey);
    const current = this._abilityChoice || this.getDefaultTemplateAbility(templateKey);
    return `
      <div class="template-ability-choice">
        <h4>Ability Bonus</h4>
        <p class="step-help">Choose where this template's +${template.abilityBonus || 2} ability bonus applies.</p>
        ${options.map(key => `
          <label class="template-ability-option">
            <input type="radio" name="templateAbility" value="${key}" data-template="${templateKey}" ${current === key ? 'checked' : ''}>
            ${key.toUpperCase()}
          </label>
        `).join('')}
      </div>
    `;
  }

  _attachTemplateListeners(shell, container) {
    container.querySelectorAll('.select-template-btn').forEach(btn => {
      btn.addEventListener('click', event => {
        event.preventDefault();
        this._selectTemplate(shell, btn.getAttribute('data-template'));
      });
    });
    container.querySelectorAll('input[name="templateAbility"]').forEach(input => {
      input.addEventListener('change', () => {
        this._abilityChoice = input.value;
        this.saveFollowerChoice(shell, 'abilityChoice', input.value);
      });
    });
  }

  _selectTemplate(shell, templateType) {
    this._selectedTemplate = templateType;
    this.saveFollowerChoice(shell, 'templateType', templateType);
    if (this._isDroid) {
      this.saveFollowerChoice(shell, 'abilityChoice', null);
    } else {
      this._abilityChoice = this.getDefaultTemplateAbility(templateType);
      this.saveFollowerChoice(shell, 'abilityChoice', this._abilityChoice);
    }
    swseLogger.log('[FollowerTemplateStep] Selected template:', templateType);
    shell.render();
  }

  async onStepCommit(shell) {
    if (!this._selectedTemplate) {
      ui?.notifications?.warn?.('Please select a template for your follower.');
      return false;
    }
    if (!this._isDroid && !this._abilityChoice) {
      ui?.notifications?.warn?.('Choose the follower template ability bonus.');
      return false;
    }
    this.saveFollowerChoice(shell, 'templateType', this._selectedTemplate);
    this.saveFollowerChoice(shell, 'abilityChoice', this._isDroid ? null : this._abilityChoice);
    return true;
  }

  _formatDefenseBonus(defenseBonus) {
    const map = { fort: 'Fortitude', fortitude: 'Fortitude', ref: 'Reflex', reflex: 'Reflex', will: 'Will' };
    return Object.entries(defenseBonus || {}).map(([key, value]) => `+${value} ${map[key] || key}`).join(', ');
  }

  getUtilityBarConfig() {
    return { showSearch: false, showSort: false, showFilter: false };
  }
}
